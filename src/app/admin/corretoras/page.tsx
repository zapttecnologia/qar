'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Corretora {
  id: string; nome: string; cnpj: string | null
  plano_assinatura: string; plano_valor: number | null
  status_assinatura: string; bloqueada: boolean
  total_cotacoes: number; total_membros: number; cotacoes_mes_atual: number
}

const PLANO_CORES: Record<string, { bg: string; text: string }> = {
  trial:        { bg: '#21262d', text: '#8b949e' },
  basico:       { bg: '#0d1f3c', text: '#58a6ff' },
  profissional: { bg: '#1a0f3c', text: '#a78bfa' },
  enterprise:   { bg: '#2d1a00', text: '#f59e0b' },
}

export default function AdminCorretorasPage() {
  const router = useRouter()
  const supabase = createClient()
  const [corretoras, setCorretoras] = useState<Corretora[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any).from('vw_metricas_corretoras').select('*').order('criado_em', { ascending: false })
      .then(({ data }: { data: Corretora[] }) => { setCorretoras(data ?? []); setCarregando(false) })
  }, [])

  const filtradas = corretoras.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.cnpj ?? '').includes(busca)
  )

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3' }}>Corretoras</h1>
          <p style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>{corretoras.length} corretoras cadastradas</p>
        </div>
        <Link href="/admin/corretoras/nova"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#7c3aed', color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
          Nova corretora
        </Link>
      </div>

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou CNPJ..."
          style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: '#161b22', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* Tabela */}
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, overflow: 'hidden' }}>
        {carregando ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: '#8b949e' }}>Carregando...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #30363d', background: '#0d1117' }}>
                {['Corretora','CNPJ','Plano','Valor/mês','Membros','Cotações','Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(c => {
                const plano = PLANO_CORES[c.plano_assinatura] ?? PLANO_CORES.trial
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #21262d', cursor: 'pointer' }}
                    onClick={() => router.push(`/admin/corretoras/${c.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1c2330')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {c.bloqueada && <i className="ti ti-alert-triangle" style={{ color: '#f85149', fontSize: 14 }} aria-hidden="true" />}
                        <span style={{ fontWeight: 500, color: '#e6edf3', fontSize: 13 }}>{c.nome}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8b949e', fontSize: 12 }}>{c.cnpj ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: plano.bg, color: plano.text, padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, textTransform: 'capitalize' }}>{c.plano_assinatura}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8b949e', fontSize: 12 }}>
                      {c.plano_valor ? `R$ ${Number(c.plano_valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8b949e', fontSize: 13 }}>{c.total_membros ?? 0}</td>
                    <td style={{ padding: '12px 16px', color: '#8b949e', fontSize: 13 }}>{c.total_cotacoes ?? 0}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: c.bloqueada ? '#2d0e0e' : c.status_assinatura === 'ativa' ? '#0d2b1a' : '#21262d',
                        color: c.bloqueada ? '#f85149' : c.status_assinatura === 'ativa' ? '#3fb950' : '#8b949e',
                        padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                      }}>
                        {c.bloqueada ? 'Bloqueada' : c.status_assinatura}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {filtradas.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #21262d', fontSize: 11, color: '#8b949e', textAlign: 'right' }}>
            {filtradas.length} de {corretoras.length} corretoras
          </div>
        )}
      </div>
    </div>
  )
}
