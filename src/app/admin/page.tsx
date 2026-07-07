'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Corretora {
  id: string; nome: string; plano_assinatura: string; status_assinatura: string
  bloqueada: boolean; total_cotacoes: number; cotacoes_mes_atual: number; criado_em: string
}

const PLANO_CORES: Record<string, { bg: string; text: string }> = {
  trial:        { bg: '#21262d', text: '#8b949e' },
  basico:       { bg: '#0d1f3c', text: '#58a6ff' },
  profissional: { bg: '#1a0f3c', text: '#a78bfa' },
  enterprise:   { bg: '#2d1a00', text: '#f59e0b' },
}

export default function AdminPage() {
  const supabase = createClient()
  const [corretoras, setCorretoras] = useState<Corretora[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any).from('vw_metricas_corretoras').select('*').order('criado_em', { ascending: false })
      .then(({ data }: { data: Corretora[] }) => { setCorretoras(data ?? []); setCarregando(false) })
  }, [])

  const ativas   = corretoras.filter(c => c.status_assinatura === 'ativa' && !c.bloqueada).length
  const trial    = corretoras.filter(c => c.plano_assinatura === 'trial').length
  const total_cot = corretoras.reduce((s, c) => s + (c.total_cotacoes ?? 0), 0)
  const mes_cot  = corretoras.reduce((s, c) => s + (c.cotacoes_mes_atual ?? 0), 0)
  const bloqueadas = corretoras.filter(c => c.bloqueada).length

  const card = (label: string, value: number | string, icon: string, cor: string) => (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color: cor }} aria-hidden="true" />
        <span style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: '#e6edf3' }}>{value}</div>
    </div>
  )

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3' }}>Visão geral</h1>
        <p style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>Painel de gestão global do sistema</p>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {card('Corretoras ativas', ativas, 'ti-building', '#58a6ff')}
        {card('Em trial', trial, 'ti-clock', '#f59e0b')}
        {card('Total cotações', total_cot, 'ti-file-text', '#3fb950')}
        {card('Cotações este mês', mes_cot, 'ti-chart-bar', '#a78bfa')}
      </div>

      {/* Alerta de bloqueadas */}
      {bloqueadas > 0 && (
        <div style={{ background: '#2d0e0e', border: '1px solid #f85149', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-alert-triangle" style={{ color: '#f85149', fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
          <p style={{ fontSize: 13, color: '#f85149' }}>
            {bloqueadas} corretora{bloqueadas > 1 ? 's' : ''} bloqueada{bloqueadas > 1 ? 's' : ''}.{' '}
            <Link href="/admin/corretoras" style={{ color: '#f85149', textDecoration: 'underline' }}>Ver detalhes</Link>
          </p>
        </div>
      )}

      {/* Tabela */}
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #30363d' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Corretoras recentes</h2>
          <Link href="/admin/corretoras" style={{ fontSize: 12, color: '#58a6ff', textDecoration: 'none' }}>Ver todas →</Link>
        </div>

        {carregando ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: '#8b949e' }}>Carregando...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #30363d' }}>
                {['Corretora', 'Plano', 'Cotações', 'Este mês', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.4px', background: '#0d1117' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corretoras.slice(0, 8).map(c => {
                const plano = PLANO_CORES[c.plano_assinatura] ?? PLANO_CORES.trial
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #21262d', cursor: 'pointer' }}
                    onClick={() => window.location.href = `/admin/corretoras/${c.id}`}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1c2330')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {c.bloqueada && <i className="ti ti-alert-triangle" style={{ color: '#f85149', fontSize: 14 }} aria-hidden="true" />}
                        <span style={{ fontWeight: 500, color: '#e6edf3', fontSize: 13 }}>{c.nome}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: plano.bg, color: plano.text, padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, textTransform: 'capitalize' }}>{c.plano_assinatura}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8b949e', fontSize: 13 }}>{c.total_cotacoes ?? 0}</td>
                    <td style={{ padding: '12px 16px', color: '#8b949e', fontSize: 13 }}>{c.cotacoes_mes_atual ?? 0}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: c.bloqueada ? '#2d0e0e' : c.status_assinatura === 'ativa' ? '#0d2b1a' : '#21262d',
                        color: c.bloqueada ? '#f85149' : c.status_assinatura === 'ativa' ? '#3fb950' : '#8b949e',
                        padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                      }}>
                        {c.bloqueada ? 'Bloqueada' : c.status_assinatura}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/corretoras/${c.id}`} style={{ fontSize: 12, color: '#58a6ff', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>Ver →</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
