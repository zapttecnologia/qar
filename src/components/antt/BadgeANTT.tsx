'use client'

import { useState, useEffect } from 'react'
import { ResultadoANTT } from '@/hooks/useANTT'

interface Props {
  resultado: ResultadoANTT | null
  consultando: boolean
  pendente?: boolean
  erro: string | null
  onConsultar?: () => void
  compact?: boolean
}

export function BadgeANTT({ resultado, consultando, pendente = false, erro, onConsultar, compact = false }: Props) {
  const COR: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    verde:    { bg: '#0d2b1a', border: '#3fb95040', text: '#3fb950', icon: 'ti-circle-check' },
    amarelo:  { bg: '#2d1a00', border: '#f59e0b40', text: '#f59e0b', icon: 'ti-alert-triangle' },
    vermelho: { bg: '#2d0e0e', border: '#f8514940', text: '#f85149', icon: 'ti-circle-x' },
  }
  const COR_PADRAO = { bg: '#21262d', border: '#30363d', text: '#8b949e', icon: 'ti-help-circle' }

  const [segundos, setSegundos] = useState(0)
  useEffect(() => {
    if (!pendente && !consultando) { setSegundos(0); return }
    const t = setInterval(() => setSegundos(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [pendente, consultando])

  if (consultando || pendente) {
    const msg = consultando
      ? 'Consultando OpenCheck...'
      : segundos < 15
        ? 'Processando consulta...'
        : segundos < 45
          ? `Aguardando resultado... (${segundos}s)`
          : `A OpenCheck está processando. Pode levar até 3 minutos... (${segundos}s)`

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: compact ? '4px 10px' : '8px 12px', background: '#0d1f3c', border: '1px solid #1a4a8a', borderRadius: 6 }}>
        <div style={{ width: 14, height: 14, border: '2px solid #58a6ff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
        <span style={{ fontSize: compact ? 11 : 12, color: '#58a6ff' }}>{compact ? 'Consultando...' : msg}</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (erro) {
    return (
      <div style={{ background: '#2d0e0e', border: '1px solid #f8514940', borderRadius: 6, padding: compact ? '6px 10px' : '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 14, color: '#f85149', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: compact ? 11 : 12, color: '#f85149', flex: 1 }}>{erro}</span>
          {onConsultar && (
            <button onClick={onConsultar}
              style={{ fontSize: 11, color: '#58a6ff', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', padding: 0, fontWeight: 500 }}>
              Tentar novamente
            </button>
          )}
        </div>
        {!compact && (
          <p style={{ fontSize: 11, color: '#8b949e', margin: '6px 0 0', lineHeight: 1.4 }}>
            A OpenCheck processa as consultas de forma assíncrona e pode demorar alguns minutos. 
            Clique em "Tentar novamente" para buscar o resultado já processado.
          </p>
        )}
      </div>
    )
  }

  if (!resultado) {
    if (!onConsultar) return null
    return (
      <button onClick={onConsultar}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: compact ? '4px 10px' : '7px 12px', background: 'none', border: '1px solid #30363d', borderRadius: 6, color: '#8b949e', fontSize: compact ? 11 : 12, cursor: 'pointer' }}>
        <i className="ti ti-search" style={{ fontSize: 13 }} aria-hidden="true" />
        Consultar ANTT
      </button>
    )
  }

  const c = COR[resultado.status_cor] ?? COR_PADRAO

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 9px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 5 }}>
        <i className={`ti ${c.icon}`} style={{ fontSize: 12, color: c.text }} aria-hidden="true" />
        <span style={{ fontSize: 11, fontWeight: 600, color: c.text }}>ANTT {resultado.status_label}</span>
        {resultado.rntrc && <span style={{ fontSize: 10, color: '#8b949e' }}>· {resultado.rntrc}</span>}
      </div>
    )
  }

  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: resultado.rntrc ? 6 : 0 }}>
        <i className={`ti ${c.icon}`} style={{ fontSize: 16, color: c.text, flexShrink: 0 }} aria-hidden="true" />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>RNTRC {resultado.status_label}</span>
          {resultado.detalhe && (
            <span style={{ fontSize: 11, color: '#8b949e', marginLeft: 8 }}>{resultado.detalhe}</span>
          )}
        </div>
        {onConsultar && (
          <button onClick={onConsultar}
            style={{ fontSize: 10, color: '#58a6ff', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', padding: 0 }}>
            Atualizar
          </button>
        )}
      </div>
      {resultado.rntrc && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#8b949e' }}>RNTRC:</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e6edf3', fontFamily: 'monospace' }}>{resultado.rntrc}</span>
        </div>
      )}
    </div>
  )
}
