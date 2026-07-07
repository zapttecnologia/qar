'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSessao, usePode } from '@/hooks/useSessao'
import { createClient } from '@/lib/supabase/client'

interface Membro {
  id: string
  papel: string
  convite_aceito: boolean
  criado_em: string
  usuario: { id: string; nome: string; email: string } | null
}

const PAPEL_COR: Record<string, { bg: string; text: string; label: string }> = {
  admin:        { bg: 'var(--status-pending-bg)',  text: 'var(--status-pending-text)',  label: 'Admin' },
  aprovador:    { bg: 'var(--status-sent-bg)',     text: 'var(--status-sent-text)',     label: 'Aprovador' },
  corretor:     { bg: 'var(--status-approved-bg)', text: 'var(--status-approved-text)', label: 'Corretor' },
  visualizador: { bg: 'var(--status-draft-bg)',    text: 'var(--status-draft-text)',    label: 'Visualizador' },
}

export default function EquipePage() {
  const { corretora } = useSessao()
  const pode = usePode('gerenciar_equipe')
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [papel, setPapel] = useState('corretor')
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')

  const { data: limiteInfo } = useQuery({
    queryKey: ['limite-membros', corretora?.id],
    queryFn: async () => {
      // Busca plano da corretora
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const { data: cor } = await sb
        .from('corretoras')
        .select('plano_id, plano_vencimento, planos(max_usuarios, label, duracao_dias)')
        .eq('id', corretora!.id)
        .single()
      const { data: contagem } = await sb
        .from('membros')
        .select('id', { count: 'exact', head: true })
        .eq('corretora_id', corretora!.id)
        .eq('convite_aceito', true)
      const plano = (cor as Record<string, unknown>)?.planos as Record<string, unknown> | null
      const max = plano?.max_usuarios as number ?? null
      const atual = (contagem as unknown as number) ?? 0
      const vencimento = (cor as Record<string, unknown>)?.plano_vencimento as string | null
      const expirado = vencimento ? new Date() > new Date(vencimento) : false
      return { max, atual, label: plano?.label as string ?? null, expirado, podeAdicionar: !expirado && (max === null || atual < max) }
    },
    enabled: !!corretora?.id,
  })

  const { data: membros, isLoading } = useQuery({
    queryKey: ['membros', corretora?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('membros')
        .select('id, papel, convite_aceito, criado_em, usuario:usuarios(id, nome, email)')
        .eq('corretora_id', corretora!.id)
        .order('criado_em')
      return (data ?? []) as unknown as Membro[]
    },
    enabled: !!corretora?.id,
  })

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome || !email || !senha || !corretora) return
    setCriando(true); setErro(''); setOk('')
    try {
      const res = await fetch('/api/criar-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, papel, corretora_id: corretora.id }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? 'Erro ao criar usuário.'); return }
      setNome(''); setEmail(''); setSenha(''); setPapel('corretor')
      setOk(`${nome} adicionado(a) como ${papel}.`)
      await queryClient.invalidateQueries({ queryKey: ['membros', corretora.id] })
    } catch { setErro('Erro de conexão. Tente novamente.') }
    setCriando(false)
  }

  async function handleRemover(membroId: string) {
    if (!confirm('Remover este membro da equipe?')) return
    await supabase.from('membros').delete().eq('id', membroId)
    await queryClient.invalidateQueries({ queryKey: ['membros', corretora?.id] })
  }

  async function handleTrocarPapel(membroId: string, novoPapel: string) {
    await supabase.from('membros').update({ papel: novoPapel } as never).eq('id', membroId)
    await queryClient.invalidateQueries({ queryKey: ['membros', corretora?.id] })
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Equipe</h1>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>Membros da corretora e seus papéis</p>
      </div>

      {/* Aviso de limite */}
      {limiteInfo && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, border: `1px solid ${!limiteInfo.podeAdicionar ? '#f85149' : limiteInfo.max !== null && limiteInfo.atual >= limiteInfo.max * 0.8 ? '#f59e0b30' : 'var(--border-color)'}`, background: !limiteInfo.podeAdicionar ? 'var(--status-pending-bg)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className={`ti ${!limiteInfo.podeAdicionar ? 'ti-alert-triangle' : 'ti-users'}`} style={{ fontSize: 15, color: !limiteInfo.podeAdicionar ? 'var(--status-pending-text)' : 'var(--text-2)' }} aria-hidden="true" />
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: !limiteInfo.podeAdicionar ? 'var(--status-pending-text)' : 'var(--text-1)' }}>
                {limiteInfo.expirado ? 'Plano expirado — não é possível adicionar membros'
                  : limiteInfo.max !== null ? `${limiteInfo.atual} de ${limiteInfo.max} usuários utilizados`
                  : `${limiteInfo.atual} usuários`}
              </p>
              {limiteInfo.label && <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Plano {limiteInfo.label}</p>}
            </div>
          </div>
          {limiteInfo.max !== null && (
            <div style={{ width: 80, height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((limiteInfo.atual / limiteInfo.max) * 100, 100)}%`, height: '100%', background: limiteInfo.atual >= limiteInfo.max ? '#f85149' : limiteInfo.atual >= limiteInfo.max * 0.8 ? '#f59e0b' : '#10b981', borderRadius: 3, transition: 'width .3s' }} />
            </div>
          )}
        </div>
      )}

      {/* Criar novo membro */}
      {pode && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
            <i className="ti ti-user-plus" style={{ fontSize: 15, color: 'var(--text-2)' }} aria-hidden="true" />
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Adicionar membro</h2>
          </div>
          <form onSubmit={handleCriar} style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="field-label">Nome completo *</label>
                <input value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Nome do corretor" required className="field-input" style={{ fontSize: 13 }} />
              </div>
              <div>
                <label className="field-label">E-mail *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@corretora.com.br" required className="field-input" style={{ fontSize: 13 }} />
              </div>
              <div>
                <label className="field-label">Senha inicial *</label>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres" required minLength={6} className="field-input" style={{ fontSize: 13 }} />
              </div>
              <div>
                <label className="field-label">Papel</label>
                <select value={papel} onChange={e => setPapel(e.target.value)}
                  className="field-input" style={{ fontSize: 13 }}>
                  <option value="admin">Admin</option>
                  <option value="aprovador">Aprovador</option>
                  <option value="corretor">Corretor</option>
                  <option value="visualizador">Visualizador</option>
                </select>
              </div>
            </div>
            {erro && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{erro}</p>}
            {ok && <p style={{ fontSize: 12, color: '#059669', marginBottom: 10 }}>✓ {ok}</p>}
            <button type="submit" disabled={criando || !limiteInfo?.podeAdicionar} className="btn-primary" style={{ fontSize: 13, opacity: !limiteInfo?.podeAdicionar ? .5 : 1 }}>
              <i className="ti ti-user-plus" style={{ fontSize: 13 }} aria-hidden="true" />
              {criando ? 'Criando...' : 'Criar e adicionar'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
              O usuário receberá as credenciais e poderá fazer login imediatamente.
            </p>
          </form>
        </div>
      )}

      {/* Lista de membros */}
      <div className="card">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-users" style={{ fontSize: 15, color: 'var(--text-2)' }} aria-hidden="true" />
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
            Membros ({membros?.length ?? 0})
          </h2>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>Carregando equipe...</div>
        ) : membros?.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>Nenhum membro ainda.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Membro</th>
                  <th>Papel</th>
                  <th className="hide-mobile">Adicionado em</th>
                  {pode && <th style={{ width: 48 }} />}
                </tr>
              </thead>
              <tbody>
                {membros?.map(m => {
                  const p = PAPEL_COR[m.papel] ?? PAPEL_COR.corretor
                  return (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--accent-text)', flexShrink: 0 }}>
                            {m.usuario?.nome?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{m.usuario?.nome ?? '—'}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.usuario?.email ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {pode ? (
                          <select value={m.papel} onChange={e => handleTrocarPapel(m.id, e.target.value)}
                            style={{ background: p.bg, color: p.text, border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
                            <option value="admin">Admin</option>
                            <option value="aprovador">Aprovador</option>
                            <option value="corretor">Corretor</option>
                            <option value="visualizador">Visualizador</option>
                          </select>
                        ) : (
                          <span style={{ background: p.bg, color: p.text, padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>{p.label}</span>
                        )}
                      </td>
                      <td className="hide-mobile" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {new Date(m.criado_em).toLocaleDateString('pt-BR')}
                      </td>
                      {pode && (
                        <td>
                          <button onClick={() => handleRemover(m.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                            <i className="ti ti-trash" style={{ fontSize: 15 }} aria-hidden="true" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="card" style={{ marginTop: 16, padding: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>Permissões por papel</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { papel: 'Admin', desc: 'Acesso total: gerencia equipe, configurações e todas as cotações' },
            { papel: 'Aprovador', desc: 'Cria, edita e aprova cotações. Não gerencia equipe' },
            { papel: 'Corretor', desc: 'Cria e edita suas próprias cotações' },
            { papel: 'Visualizador', desc: 'Apenas visualiza cotações, sem editar' },
          ].map(p => (
            <div key={p.papel} style={{ background: 'var(--bg-page)', borderRadius: 6, padding: '10px 12px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{p.papel}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
