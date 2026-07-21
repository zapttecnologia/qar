'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSessao } from './useSessao'

interface StatusCotacoes {
  pode: boolean
  usadas: number
  limite: number | null
  restantes: number | null
  alerta: boolean
  motivo?: string
  mensagem?: string
  plano?: string
  carregando: boolean
}

export function useCotacoes(): StatusCotacoes & { recarregar: () => void } {
  const { corretora } = useSessao()
  const [status, setStatus] = useState<StatusCotacoes>({
    pode: true, usadas: 0, limite: null, restantes: null,
    alerta: false, carregando: true,
  })

  const carregar = useCallback(async () => {
    if (!corretora?.id) {
      setStatus(p => ({ ...p, carregando: false }))
      return
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = createClient() as any
      const { data } = await sb.rpc('pode_criar_cotacao', { p_corretora_id: corretora.id })
      if (data) setStatus({ ...data as StatusCotacoes, carregando: false })
      else setStatus(p => ({ ...p, carregando: false }))
    } catch {
      setStatus(p => ({ ...p, carregando: false }))
    }
  }, [corretora?.id])

  useEffect(() => { carregar() }, [carregar])

  return { ...status, recarregar: carregar }
}
