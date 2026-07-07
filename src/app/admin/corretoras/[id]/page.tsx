'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

const d = {
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 10, marginBottom: 14 } as React.CSSProperties,
  hdr: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid #30363d' } as React.CSSProperties,
  body: { padding: 16 } as React.CSSProperties,
  lbl: { display: 'block', fontSize: 12, fontWeight: 500, color: '#8b949e', marginBottom: 5 } as React.CSSProperties,
  inp: { width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  sel: { width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><label style={d.lbl}>{label}</label>{children}</div>
}

export default function AdminCorretoraDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params.id as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createClient() as any

  const [corretora, setCorretora] = useState<Corretora | null>(null)
  const [membros, setMembros] = useState<Membro[]>([])
  const [metricas, setMetricas] = useState<Record<string, number>>({})
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState<Partial<Corretora>>({})
  const setF = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  // Estado para criar admin
  const [novoAdminNome, setNovoAdminNome] = useState('')
  const [novoAdminEmail, setNovoAdminEmail] = useState('')
  const [novoAdminSenha, setNovoAdminSenha] = useState('')
  const [novoAdminPapel, setNovoAdminPapel] = useState('admin')
  const [criandoAdmin, setCriandoAdmin] = useState(false)
  const [adminErro, setAdminErro] = useState('')
  const [adminOk, setAdminOk] = useState('')

  const [aviso, setAviso] = useState(
    searchParams.get('criada') === '1'
      ? 'Corretora criada com sucesso! Adicione o usuário administrador abaixo.'
      : ''
  )

  async function carregar() {
    const corRes = await sb.from('corretoras').select('*').eq('id', id).single()
    const membRes = await sb.from('membros').select('id, papel, usuario:usuarios(nome, email)').eq('corretora_id', id)
    const metRes = await sb.from('vw_metricas_corretoras').select('total_cotacoes, cotacoes_mes_atual, total_membros').eq('id', id).single()
    if (corRes.data) { setCorretora(corRes.data as Corretora); setForm(corRes.data as Corretora) }
    setMembros((membRes.data ?? []) as Membro[])
    setMetricas((metRes.data ?? {}) as Record<string, number>)
  }

  useEffect(() => { carregar() }, [id])

  async function handleSalvar() {
    setSalvando(true)
    await sb.from('corretoras').update({
      plano_assinatura: form.plano_assinatura,
      plano_valor: form.plano_valor,
      plano_vencimento: form.plano_vencimento || null,
      plano_obs: form.plano_obs,
      status_assinatura: form.status_assinatura,
    }).eq('id', id)
    setSalvando(false)
    setAviso('Salvo com sucesso!')
    setTimeout(() => setAviso(''), 3000)
  }

  async function handleBloqueio() {
    const novoEstado = !form.bloqueada
    const motivo = novoEstado ? prompt('Motivo do bloqueio:') : null
    if (novoEstado && !motivo) return
    await sb.from('corretoras').update({ bloqueada: novoEstado, bloqueada_motivo: motivo, status_assinatura: novoEstado ? 'cancelada' : 'ativa' }).eq('id', id)
    setForm(p => ({ ...p, bloqueada: novoEstado, status_assinatura: novoEstado ? 'cancelada' : 'ativa' }))
    setAviso(novoEstado ? 'Corretora bloqueada.' : 'Corretora desbloqueada.')
    setTimeout(() => setAviso(''), 3000)
  }

  async function handleCriarUsuario() {
    if (!novoAdminNome || !novoAdminEmail || !novoAdminSenha) {
      setAdminErro('Preencha nome, e-mail e senha.'); return
    }
    if (novoAdminSenha.length < 6) {
      setAdminErro('A senha deve ter pelo menos 6 caracteres.'); return
    }
    setCriandoAdmin(true); setAdminErro(''); setAdminOk('')
    try {
      const res = await fetch('/api/criar-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoAdminNome,
          email: novoAdminEmail,
          senha: novoAdminSenha,
          papel: novoAdminPapel,
          corretora_id: id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAdminErro(data.error ?? 'Erro ao criar usuário.')
      } else {
        setAdminOk(`✓ ${novoAdminNome} adicionado como ${novoAdminPapel} da corretora.`)
        setNovoAdminNome(''); setNovoAdminEmail(''); setNovoAdminSenha('')
        await carregar()
      }
    } catch { setAdminErro('Erro de conexão.') }
    setCriandoAdmin(false)
  }

  async function handleRemoverMembro(membroId: string) {
    if (!confirm('Remover este membro da corretora?')) return
    await sb.from('membros').delete().eq('id', membroId)
    await carregar()
  }

  if (!corretora) return <div style={{ padding: 40, textAlign: 'center', color: '#8b949e', fontSize: 13 }}>Carregando...</div>

  const PAPEL_COR: Record<string, { bg: string; text: string }> = {
    admin:        { bg: '#2d0e0e', text: '#f85149' },
    aprovador:    { bg: '#0d1f3c', text: '#58a6ff' },
    corretor:     { bg: '#0d2b1a', text: '#3fb950' },
    visualizador: { bg: '#21262d', text: '#8b949e' },
  }

  return (
    <div style={{ padding: 20, maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: '1px solid #30363d', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8b949e' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 15 }} aria-hidden="true" />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3', margin: 0 }}>{corretora.nome}</h1>
              {form.bloqueada && <span style={{ background: '#2d0e0e', color: '#f85149', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>Bloqueada</span>}
            </div>
            <p style={{ fontSize: 12, color: '#8b949e', margin: '3px 0 0' }}>{corretora.cnpj ?? 'CNPJ não informado'} · desde {new Date(corretora.criado_em).toLocaleDateString('pt-BR')}</p>
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
        <div style={{ background: aviso.includes('criada') ? '#1a0f3c' : '#0d2b1a', border: `1px solid ${aviso.includes('criada') ? '#7c3aed' : '#3fb950'}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: aviso.includes('criada') ? '#a78bfa' : '#3fb950', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`ti ${aviso.includes('criada') ? 'ti-info-circle' : 'ti-check'}`} style={{ fontSize: 14, flexShrink: 0 }} aria-hidden="true" />
          {aviso}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        {/* Coluna principal */}
        <div>
          {/* Métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            {[['Usuários', metricas.total_membros ?? 0, 'ti-users'], ['Cotações', metricas.total_cotacoes ?? 0, 'ti-file-text'], ['Este mês', metricas.cotacoes_mes_atual ?? 0, 'ti-calendar']].map(([lbl, val, icon]) => (
              <div key={lbl as string} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <i className={`ti ${icon}`} style={{ fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
                  <span style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>{lbl as string}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#e6edf3' }}>{val as number}</div>
              </div>
            ))}
          </div>

          {/* Plano e faturamento */}
          <div style={d.card}>
            <div style={d.hdr}>
              <i className="ti ti-credit-card" style={{ fontSize: 15, color: '#8b949e' }} aria-hidden="true" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Plano e faturamento</span>
            </div>
            <div style={d.body}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Plano">
                  <select value={form.plano_assinatura ?? 'trial'} onChange={e => setF('plano_assinatura', e.target.value)} style={d.sel}>
                    {['trial','basico','profissional','enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={form.status_assinatura ?? 'ativa'} onChange={e => setF('status_assinatura', e.target.value)} style={d.sel}>
                    <option value="ativa">Ativa</option>
                    <option value="inadimplente">Inadimplente</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </Field>
                <Field label="Valor mensal (R$)">
                  <input type="number" value={form.plano_valor ?? ''} onChange={e => setF('plano_valor', e.target.value)} placeholder="0,00" style={d.inp} />
                </Field>
                <Field label="Vencimento">
                  <input type="date" value={form.plano_vencimento ?? ''} onChange={e => setF('plano_vencimento', e.target.value)} style={d.inp} />
                </Field>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Obs. faturamento">
                    <input value={form.plano_obs ?? ''} onChange={e => setF('plano_obs', e.target.value)} placeholder="Ex: Paga via PIX dia 5" style={d.inp} />
                  </Field>
                </div>
              </div>
            </div>
          </div>

          {/* Adicionar usuário */}
          <div style={d.card}>
            <div style={d.hdr}>
              <i className="ti ti-user-plus" style={{ fontSize: 15, color: '#8b949e' }} aria-hidden="true" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Adicionar usuário à corretora</span>
            </div>
            <div style={d.body}>
              <p style={{ fontSize: 12, color: '#8b949e', marginBottom: 14 }}>
                Crie um novo usuário e vincule diretamente a esta corretora. O usuário poderá fazer login imediatamente.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Nome completo *">
                  <input value={novoAdminNome} onChange={e => { setNovoAdminNome(e.target.value); setAdminErro('') }}
                    placeholder="Nome do usuário" style={d.inp} />
                </Field>
                <Field label="E-mail *">
                  <input type="email" value={novoAdminEmail} onChange={e => { setNovoAdminEmail(e.target.value); setAdminErro('') }}
                    placeholder="email@corretora.com.br" style={d.inp} />
                </Field>
                <Field label="Senha inicial * (mín. 6 caracteres)">
                  <input type="password" value={novoAdminSenha} onChange={e => { setNovoAdminSenha(e.target.value); setAdminErro('') }}
                    placeholder="Senha para primeiro acesso" style={d.inp} />
                </Field>
                <Field label="Papel na corretora">
                  <select value={novoAdminPapel} onChange={e => setNovoAdminPapel(e.target.value)} style={d.sel}>
                    <option value="admin">Admin — acesso total à corretora</option>
                    <option value="aprovador">Aprovador — cria e aprova cotações</option>
                    <option value="corretor">Corretor — cria cotações</option>
                    <option value="visualizador">Visualizador — só leitura</option>
                  </select>
                </Field>
              </div>

              {adminErro && (
                <div style={{ background: '#2d0e0e', border: '1px solid #f85149', borderRadius: 6, padding: '9px 12px', fontSize: 12, color: '#f85149', margin: '8px 0' }}>
                  {adminErro}
                </div>
              )}
              {adminOk && (
                <div style={{ background: '#0d2b1a', border: '1px solid #3fb950', borderRadius: 6, padding: '9px 12px', fontSize: 12, color: '#3fb950', margin: '8px 0' }}>
                  {adminOk}
                </div>
              )}

              <button onClick={handleCriarUsuario} disabled={criandoAdmin}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#7c3aed', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 500, cursor: criandoAdmin ? 'not-allowed' : 'pointer', opacity: criandoAdmin ? .7 : 1, marginTop: 4 }}>
                <i className="ti ti-user-plus" style={{ fontSize: 14 }} aria-hidden="true" />
                {criandoAdmin ? 'Criando usuário...' : 'Criar e adicionar à corretora'}
              </button>
            </div>
          </div>
        </div>

        {/* Coluna lateral — equipe */}
        <div style={d.card}>
          <div style={d.hdr}>
            <i className="ti ti-users" style={{ fontSize: 15, color: '#8b949e' }} aria-hidden="true" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Equipe ({membros.length})</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {membros.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <i className="ti ti-users-group" style={{ fontSize: 24, color: '#484f58', display: 'block', marginBottom: 8 }} aria-hidden="true" />
                <p style={{ fontSize: 12, color: '#8b949e', margin: 0 }}>Nenhum membro ainda.</p>
                <p style={{ fontSize: 11, color: '#484f58', marginTop: 4 }}>Adicione o admin ao lado.</p>
              </div>
            ) : membros.map(m => {
              const p = PAPEL_COR[m.papel] ?? PAPEL_COR.corretor
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #21262d' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1a0f3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#a78bfa', flexShrink: 0 }}>
                    {m.usuario?.nome?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{m.usuario?.nome ?? '—'}</p>
                    <p style={{ fontSize: 11, color: '#8b949e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0' }}>{m.usuario?.email ?? '—'}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ background: p.bg, color: p.text, padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 500, textTransform: 'capitalize' }}>{m.papel}</span>
                    <button onClick={() => handleRemoverMembro(m.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#484f58', padding: 2, display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f85149')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#484f58')}
                      title="Remover membro">
                      <i className="ti ti-trash" style={{ fontSize: 14 }} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
