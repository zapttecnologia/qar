'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Plano {
  id: string; nome: string; nome_exibicao: string
  max_usuarios: number; max_cotacoes: number | null
  duracao_dias: number | null; valor_mensal: number
  descricao: string | null; ativo: boolean
}

const dk = {
  inp: { background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box' } as React.CSSProperties,
  lbl: { display: 'block', fontSize: 11, fontWeight: 600, color: '#8b949e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px' } as React.CSSProperties,
}

const PLANO_ICON: Record<string, string> = {
  trial: 'ti-clock', basico: 'ti-star', profissional: 'ti-diamond', enterprise: 'ti-crown'
}
const PLANO_COR: Record<string, string> = {
  trial: '#8b949e', basico: '#58a6ff', profissional: '#a78bfa', enterprise: '#f59e0b'
}

export default function PlanosPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const [planos, setPlanos] = useState<Plano[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState<Partial<Plano>>({})
  const [ok, setOk] = useState('')

  async function carregar() {
    const { data } = await supabase.from('planos').select('*').order('max_usuarios')
    setPlanos(data ?? [])
    setCarregando(false)
  }
  useEffect(() => { carregar() }, [])

  function iniciarEdicao(p: Plano) { setEditando(p.id); setForm({ ...p }) }

  async function salvar() {
    if (!editando) return
    setSalvando(true)
    await supabase.from('planos').update({
      nome_exibicao: form.nome_exibicao,
      max_usuarios: Number(form.max_usuarios),
      max_cotacoes: form.max_cotacoes ? Number(form.max_cotacoes) : null,
      duracao_dias: form.duracao_dias ? Number(form.duracao_dias) : null,
      valor_mensal: Number(form.valor_mensal),
      descricao: form.descricao,
      ativo: form.ativo,
    }).eq('id', editando)
    setEditando(null)
    await carregar()
    setOk('Plano atualizado!')
    setTimeout(() => setOk(''), 2500)
    setSalvando(false)
  }

  return (
    <div style={{ padding: 20, maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3', margin: 0 }}>Planos</h1>
          <p style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>Configure limites e valores de cada plano</p>
        </div>
        {ok && <span style={{ fontSize: 12, color: '#3fb950' }}>{ok}</span>}
      </div>

      {carregando ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8b949e', fontSize: 13 }}>Carregando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {planos.map(p => {
            const cor = PLANO_COR[p.nome] ?? '#8b949e'
            const icon = PLANO_ICON[p.nome] ?? 'ti-star'
            const isEdit = editando === p.id
            return (
              <div key={p.id} style={{ background: '#161b22', border: `1px solid ${isEdit ? '#7c3aed' : '#30363d'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color .15s' }}>
                {/* Header do plano */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: isEdit ? '1px solid #30363d' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: `${cor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`ti ${icon}`} style={{ fontSize: 18, color: cor }} aria-hidden="true" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#e6edf3', margin: 0 }}>{p.nome_exibicao}</p>
                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 3, background: p.ativo ? '#0d2b1a' : '#21262d', color: p.ativo ? '#3fb950' : '#484f58', fontWeight: 500 }}>
                          {p.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      {!isEdit && (
                        <p style={{ fontSize: 12, color: '#8b949e', margin: '3px 0 0' }}>
                          {p.max_cotacoes ? `Até ${p.max_cotacoes} cotações/mês` : 'Cotações ilimitadas'}
                          {' · '}
                          {p.max_usuarios} usuário{p.max_usuarios !== 1 ? 's' : ''}
                          {p.duracao_dias ? ` · ${p.duracao_dias} dias` : ''}
                          {' · '}
                          {p.valor_mensal > 0 ? `R$ ${Number(p.valor_mensal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês` : 'Gratuito'}
                        </p>
                      )}
                    </div>
                  </div>
                  {isEdit ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={salvar} disabled={salvando}
                        style={{ padding: '6px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                        {salvando ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => setEditando(null)}
                        style={{ padding: '6px 12px', background: 'none', color: '#8b949e', border: '1px solid #30363d', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => iniciarEdicao(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'none', color: '#8b949e', border: '1px solid #30363d', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                      <i className="ti ti-pencil" style={{ fontSize: 13 }} aria-hidden="true" /> Editar
                    </button>
                  )}
                </div>

                {/* Form de edição */}
                {isEdit && (
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                      <div>
                        <label style={dk.lbl}>Nome exibido</label>
                        <input value={form.nome_exibicao ?? ''} onChange={e => setForm(f => ({ ...f, nome_exibicao: e.target.value }))} style={dk.inp} />
                      </div>
                      <div>
                        <label style={dk.lbl}>Máx. usuários</label>
                        <input type="number" value={form.max_usuarios ?? ''} onChange={e => setForm(f => ({ ...f, max_usuarios: Number(e.target.value) }))} style={dk.inp} />
                      </div>
                      <div>
                        <label style={dk.lbl}>Máx. cotações/mês</label>
                        <input type="number" value={form.max_cotacoes ?? ''} onChange={e => setForm(f => ({ ...f, max_cotacoes: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Ilimitado" style={dk.inp} />
                        <p style={{ fontSize: 10, color: '#484f58', marginTop: 4 }}>Deixe vazio para ilimitado</p>
                      </div>
                      <div>
                        <label style={dk.lbl}>Valor mensal (R$)</label>
                        <input type="number" step="0.01" value={form.valor_mensal ?? ''} onChange={e => setForm(f => ({ ...f, valor_mensal: Number(e.target.value) }))} style={dk.inp} />
                      </div>
                      <div>
                        <label style={dk.lbl}>Duração (dias)</label>
                        <input type="number" value={form.duracao_dias ?? ''} onChange={e => setForm(f => ({ ...f, duracao_dias: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Sem limite" style={dk.inp} />
                        <p style={{ fontSize: 10, color: '#484f58', marginTop: 4 }}>Vazio = sem vencimento</p>
                      </div>
                      <div>
                        <label style={dk.lbl}>Status</label>
                        <select value={form.ativo ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, ativo: e.target.value === 'true' }))} style={dk.inp}>
                          <option value="true">Ativo</option>
                          <option value="false">Inativo</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={dk.lbl}>Descrição</label>
                      <input value={form.descricao ?? ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                        placeholder="Descrição exibida para as corretoras" style={dk.inp} />
                    </div>
                  </div>
                )}

                {/* Descrição quando não edita */}
                {!isEdit && (
                  <div style={{ padding: '0 18px 12px', fontSize: 12, color: '#8b949e' }}>
                    {p.descricao && <span>{p.descricao}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}


    </div>
  )
}
