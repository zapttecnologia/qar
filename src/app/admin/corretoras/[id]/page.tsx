'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Corretora {
  id: string; nome: string; cnpj: string | null
  plano_assinatura: string; plano_valor: number | null
  plano_vencimento: string | null; plano_obs: string | null
  status_assinatura: string; bloqueada: boolean
  bloqueada_motivo: string | null; criado_em: string
}
interface Membro {
  id: string; papel: string
  usuario: { nome: string; email: string } | null
}

const dark = {
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 10, marginBottom: 14 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid #30363d' } as React.CSSProperties,
  cardBody: { padding: 16 } as React.CSSProperties,
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#8b949e', marginBottom: 5 } as React.CSSProperties,
  input: { width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  select: { width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><label style={dark.label}>{label}</label>{children}</div>
}

export default function AdminCorretoraDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params.id as string
  const supabase = createClient()

  const [corretora, setCorretora] = useState<Corretora | null>(null)
  const [membros, setMembros] = useState<Membro[]>([])
  const [metricas, setMetricas] = useState<Record<string, number>>({})
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState<Partial<Corretora>>({})
  const setF = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))
  const [aviso, setAviso] = useState(searchParams.get('novo') === '1' ? 'Corretora criada. Crie o usuário admin manualmente em Authentication → Users no Supabase.' : '')

  useEffect(() => {
    async function carregar() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const corRes = await sb.from('corretoras').select('*').eq('id', id).single()
      const membRes = await sb.from('membros').select('id, papel, usuario:usuarios(nome, email)').eq('corretora_id', id)
      const metRes = await sb.from('vw_metricas_corretoras').select('total_cotacoes, cotacoes_mes_atual, total_membros').eq('id', id).single()
      if (corRes.data) { setCorretora(corRes.data as Corretora); setForm(corRes.data as Corretora) }
      setMembros((membRes.data ?? []) as Membro[])
      setMetricas((metRes.data ?? {}) as Record<string, number>)
    }
    carregar()
  }, [id])

  async function handleSalvar() {
    setSalvando(true)
    await supabase.from('corretoras').update({
      plano_assinatura: form.plano_assinatura,
      plano_valor: form.plano_valor,
      plano_vencimento: form.plano_vencimento || null,
      plano_obs: form.plano_obs,
      status_assinatura: form.status_assinatura,
    } as never).eq('id', id)
    setSalvando(false)
    setAviso('Salvo com sucesso!')
    setTimeout(() => setAviso(''), 3000)
  }

  async function handleBloqueio() {
    const novoEstado = !form.bloqueada
    const motivo = novoEstado ? prompt('Motivo do bloqueio:') : null
    if (novoEstado && !motivo) return
    await supabase.from('corretoras').update({ bloqueada: novoEstado, bloqueada_motivo: motivo, status_assinatura: novoEstado ? 'cancelada' : 'ativa' } as never).eq('id', id)
    setForm(p => ({ ...p, bloqueada: novoEstado, status_assinatura: novoEstado ? 'cancelada' : 'ativa' }))
    setAviso(novoEstado ? 'Corretora bloqueada.' : 'Corretora desbloqueada.')
    setTimeout(() => setAviso(''), 3000)
  }

  if (!corretora) return <div style={{ padding: 40, textAlign: 'center', color: '#8b949e', fontSize: 13 }}>Carregando...</div>

  const PLANO_PAPEL: Record<string, { bg: string; text: string }> = {
    admin: { bg: '#2d0e0e', text: '#f85149' }, aprovador: { bg: '#0d1f3c', text: '#58a6ff' },
    corretor: { bg: '#0d2b1a', text: '#3fb950' }, visualizador: { bg: '#21262d', text: '#8b949e' },
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: '1px solid #30363d', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8b949e' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 16 }} aria-hidden="true" />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3' }}>{corretora.nome}</h1>
              {form.bloqueada && <span style={{ background: '#2d0e0e', color: '#f85149', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>Bloqueada</span>}
            </div>
            <p style={{ fontSize: 12, color: '#8b949e', marginTop: 3 }}>{corretora.cnpj ?? 'CNPJ não informado'} · desde {new Date(corretora.criado_em).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleBloqueio}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'none', border: `1px solid ${form.bloqueada ? '#3fb950' : '#f85149'}`, borderRadius: 6, color: form.bloqueada ? '#3fb950' : '#f85149', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            <i className={`ti ${form.bloqueada ? 'ti-lock-open' : 'ti-lock'}`} style={{ fontSize: 13 }} aria-hidden="true" />
            {form.bloqueada ? 'Desbloquear' : 'Bloquear'}
          </button>
          <button onClick={handleSalvar} disabled={salvando}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: '#7c3aed', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', opacity: salvando ? .7 : 1 }}>
            <i className="ti ti-device-floppy" style={{ fontSize: 13 }} aria-hidden="true" />
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {aviso && (
        <div style={{ background: aviso.includes('Corretora criada') ? '#2d1a00' : '#0d2b1a', border: `1px solid ${aviso.includes('Corretora criada') ? '#f59e0b' : '#3fb950'}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: aviso.includes('Corretora criada') ? '#f59e0b' : '#3fb950', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`ti ${aviso.includes('Corretora criada') ? 'ti-alert-triangle' : 'ti-check'}`} style={{ fontSize: 14, flexShrink: 0 }} aria-hidden="true" />
          {aviso}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
        <div>
          {/* Métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            {[['Usuários', metricas.total_membros ?? 0, 'ti-users'], ['Cotações', metricas.total_cotacoes ?? 0, 'ti-file-text'], ['Este mês', metricas.cotacoes_mes_atual ?? 0, 'ti-calendar']].map(([lbl, val, icon]) => (
              <div key={lbl as string} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <i className={`ti ${icon}`} style={{ fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
                  <span style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>{lbl as string}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#e6edf3' }}>{val as number}</div>
              </div>
            ))}
          </div>

          {/* Plano */}
          <div style={dark.card}>
            <div style={dark.cardHeader}>
              <i className="ti ti-credit-card" style={{ fontSize: 15, color: '#8b949e' }} aria-hidden="true" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Plano e faturamento</span>
            </div>
            <div style={dark.cardBody}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Field label="Plano">
                  <select value={form.plano_assinatura ?? 'trial'} onChange={e => setF('plano_assinatura', e.target.value)} style={dark.select}>
                    {['trial','basico','profissional','enterprise'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={form.status_assinatura ?? 'ativa'} onChange={e => setF('status_assinatura', e.target.value)} style={dark.select}>
                    <option value="ativa">Ativa</option>
                    <option value="inadimplente">Inadimplente</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </Field>
                <Field label="Valor mensal (R$)">
                  <input type="number" value={form.plano_valor ?? ''} onChange={e => setF('plano_valor', e.target.value)} placeholder="0,00" style={dark.input} />
                </Field>
                <Field label="Vencimento">
                  <input type="date" value={form.plano_vencimento ?? ''} onChange={e => setF('plano_vencimento', e.target.value)} style={dark.input} />
                </Field>
                <Field label="Obs. faturamento">
                  <input value={form.plano_obs ?? ''} onChange={e => setF('plano_obs', e.target.value)} placeholder="Ex: Paga via PIX dia 5" style={{ ...dark.input, gridColumn: '1 / -1' }} />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Equipe */}
        <div style={dark.card}>
          <div style={dark.cardHeader}>
            <i className="ti ti-users" style={{ fontSize: 15, color: '#8b949e' }} aria-hidden="true" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Equipe ({membros.length})</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {membros.length === 0 ? (
              <p style={{ padding: '16px', fontSize: 12, color: '#8b949e', textAlign: 'center' }}>Nenhum membro.</p>
            ) : membros.map(m => {
              const p = PLANO_PAPEL[m.papel] ?? PLANO_PAPEL.corretor
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #21262d' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a0f3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#a78bfa', flexShrink: 0 }}>
                    {m.usuario?.nome?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.usuario?.nome ?? '—'}</p>
                    <p style={{ fontSize: 11, color: '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.usuario?.email ?? '—'}</p>
                  </div>
                  <span style={{ background: p.bg, color: p.text, padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{m.papel}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
