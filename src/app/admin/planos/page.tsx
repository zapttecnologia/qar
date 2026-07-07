'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Plano {
  id: string; nome: string; nome_exibicao: string
  max_usuarios: number; duracao_dias: number | null
  valor_mensal: number; descricao: string | null; ativo: boolean
}

export default function PlanosPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const [planos, setPlanos] = useState<Plano[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState<Partial<Plano>>({})

  async function carregar() {
    const { data } = await supabase.from('planos').select('*').order('max_usuarios')
    setPlanos(data ?? [])
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  function iniciarEdicao(p: Plano) {
    setEditando(p.id)
    setForm({ ...p })
  }

  async function salvar() {
    if (!editando) return
    setSalvando(true)
    await supabase.from('planos').update({
      nome_exibicao: form.nome_exibicao,
      max_usuarios: Number(form.max_usuarios),
      duracao_dias: form.duracao_dias ? Number(form.duracao_dias) : null,
      valor_mensal: Number(form.valor_mensal),
      descricao: form.descricao,
      ativo: form.ativo,
    }).eq('id', editando)
    setEditando(null)
    await carregar()
    setSalvando(false)
  }

  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#8b949e', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '.4px' }
  const inputStyle = { width: '100%', padding: '7px 10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3' }}>Planos</h1>
        <p style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>Configure os planos disponíveis para as corretoras</p>
      </div>

      {carregando ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8b949e', fontSize: 13 }}>Carregando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {planos.map(p => (
            <div key={p.id} style={{ background: '#161b22', border: `1px solid ${editando === p.id ? '#7c3aed' : '#30363d'}`, borderRadius: 10, overflow: 'hidden' }}>
              {/* Header do plano */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: editando === p.id ? '1px solid #30363d' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: p.ativo ? '#1a0f3c' : '#21262d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="ti ti-crown" style={{ fontSize: 18, color: p.ativo ? '#a78bfa' : '#484f58' }} aria-hidden="true" />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>{p.nome_exibicao}</p>
                    <p style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>
                      {p.max_usuarios} usuários · {p.duracao_dias ? `${p.duracao_dias} dias` : 'Sem vencimento'} · {p.valor_mensal > 0 ? `R$ ${Number(p.valor_mensal).toFixed(2)}/mês` : 'Gratuito'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: p.ativo ? '#0d2b1a' : '#21262d', color: p.ativo ? '#3fb950' : '#484f58' }}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  {editando === p.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={salvar} disabled={salvando}
                        style={{ padding: '6px 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
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
                      <i className="ti ti-pencil" style={{ fontSize: 13 }} aria-hidden="true" />
                      Editar
                    </button>
                  )}
                </div>
              </div>

              {/* Form de edição */}
              {editando === p.id && (
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Nome exibido</label>
                    <input value={form.nome_exibicao ?? ''} onChange={e => setForm(f => ({ ...f, nome_exibicao: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Máx. usuários</label>
                    <input type="number" value={form.max_usuarios ?? ''} onChange={e => setForm(f => ({ ...f, max_usuarios: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Duração (dias)</label>
                    <input type="number" value={form.duracao_dias ?? ''} onChange={e => setForm(f => ({ ...f, duracao_dias: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="Sem limite" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Valor mensal (R$)</label>
                    <input type="number" value={form.valor_mensal ?? ''} onChange={e => setForm(f => ({ ...f, valor_mensal: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '2 / -1' }}>
                    <label style={labelStyle}>Descrição</label>
                    <input value={form.descricao ?? ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.ativo ?? true} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                        style={{ width: 16, height: 16 }} />
                      <span style={{ fontSize: 13, color: '#e6edf3' }}>Plano ativo</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Descrição quando não está editando */}
              {editando !== p.id && p.descricao && (
                <div style={{ padding: '0 16px 12px', fontSize: 12, color: '#8b949e' }}>{p.descricao}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
