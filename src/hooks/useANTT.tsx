'use client'

import { useState, useCallback, useRef } from 'react'

export interface ResultadoOpenCheck {
  rntrc: string | null
  antt_ativo: boolean
  situacao_antt: string | null
  status_label: string
  status_cor: 'verde' | 'amarelo' | 'vermelho'
  detalhe: string | null
}

// Alias para compatibilidade
export type ResultadoANTT = ResultadoOpenCheck

export function useANTT() {
  const [consultando, setConsultando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoOpenCheck | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, setPendente] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tentativasRef = useRef(0)

  function pararPolling() {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
    tentativasRef.current = 0
  }

  function parseResultado(d: Record<string, unknown>): ResultadoOpenCheck {
    return {
      rntrc:         d.rntrc         as string | null,
      antt_ativo:    d.antt_ativo    as boolean ?? false,
      situacao_antt: d.situacao_antt as string | null,
      status_label:  d.status_label  as string ?? '—',
      status_cor:    (d.status_cor   as 'verde' | 'amarelo' | 'vermelho') ?? 'vermelho',
      detalhe:       d.detalhe       as string | null,
    }
  }

  async function buscarApenas(cnpjLimpo: string): Promise<boolean> {
    try {
      const r = await fetch('/api/antt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: cnpjLimpo, apenas_buscar: true }),
      })
      const d = await r.json()
      if (r.ok && d.ok) {
        pararPolling()
        setPendente(false)
        setResultado(parseResultado(d))
        return true
      }
    } catch { /* continua */ }
    return false
  }

  const consultar = useCallback(async (cnpj: string): Promise<ResultadoOpenCheck | null> => {
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) return null

    pararPolling()
    setConsultando(true)
    setErro(null)
    setResultado(null)
    setPendente(false)

    try {
      const res = await fetch('/api/antt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: cnpjLimpo }),
      })
      const data = await res.json()

      if (res.ok && data.ok) {
        const r = parseResultado(data)
        setResultado(r)
        setConsultando(false)
        return r
      }

      if (res.status === 202 && data.pendente) {
        setConsultando(false)
        setPendente(true)

        // Polling a cada 5s por até 3 minutos (36 tentativas)
        pollingRef.current = setInterval(async () => {
          tentativasRef.current++
          if (tentativasRef.current > 36) {
            pararPolling()
            setPendente(false)
            setErro('A OpenCheck ainda não retornou o resultado. Clique em "Tentar novamente" para buscar.')
            return
          }
          await buscarApenas(cnpjLimpo)
        }, 5000)

        return null
      }

      setErro(data.mensagem ?? data.error ?? 'Erro na consulta')
      setConsultando(false)
      return null

    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro de conexão')
      setConsultando(false)
      return null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const limpar = useCallback(() => {
    pararPolling()
    setResultado(null)
    setErro(null)
    setPendente(false)
  }, [])

  return { consultar, consultando, pendente, resultado, erro, limpar }
}
