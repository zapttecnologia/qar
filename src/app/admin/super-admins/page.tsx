'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'


interface SuperAdmin {
  id: string; usuario_id: string; nome: string | null
  email: string | null; ativo: boolean; criado_em: string
}

const dk = {
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 10 } as React.CSSProperties,
  inp: { width: '100%', padding: '8px 10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  lbl: { fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 5 } as React.CSSProperties,
  t1: { color: '#e6edf3' }, t2: { color: '#8b949e' },
}

export default function SuperAdminsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createClient() as any
  const [lista, setLista] = useState<SuperAdmin[]>([])
  const [modalCriar, setModalCriar] = useState(false)
  const [modalEditar, setModalEditar] = useState<SuperAdmin | null>(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '' })
  const [formEdit, setFormEdit] = useState({ nome: '', email: '', senha_nova: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [erroEdit, setErroEdit] = useState('')
  const [ok, setOk] = useState('')

  async function carregar() {
    const { data } = await sb.from('super_admins').select('*').order('criado_em')
    setLista(data ?? [])
  }
  useEffect(() => { carregar() }, [])

  function abrirEditar(sa: SuperAdmin) {
    setModalEditar(sa)
    setFormEdit({ nome: sa.nome ?? '', email: sa.email ?? '', senha_nova: '' })
    setErroEdit('')
  }

  async function handleCriar() {
    if (!form.nome || !form.email || !form.senha) { setErro('Preencha todos os campos.'); return }
    if (form.senha.length < 6) { setErro('Senha mínima de 6 caracteres.'); return }
    setSalvando(true); setErro('')
    try {
      // Cria usuário via API
      const res = await fetch('/api/criar-usuario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome, email: form.email, senha: form.senha, papel: 'admin', corretora_id: null }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? 'Erro ao criar usuário.'); setSalvando(false); return }

      // Registra na tabela super_admins
      await sb.from('super_admins').insert({
        usuario_id: data.usuario_id ?? data.id,
        nome: form.nome,
        email: form.email,
        ativo: true,
      } as never)

      setModalCriar(false)
      setForm({ nome: '', email: '', senha: '' })
      setOk('Super admin criado com sucesso!')
      setTimeout(() => setOk(''), 3000)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro.')
    }
    setSalvando(false)
  }

  async function handleSalvarEdicao() {
    if (!modalEditar) return
    if (!formEdit.nome || !formEdit.email) { setErroEdit('Nome e e-mail são obrigatórios.'); return }
    if (formEdit.senha_nova && formEdit.senha_nova.length < 6) { setErroEdit('Nova senha deve ter pelo menos 6 caracteres.'); return }
    setSalvando(true); setErroEdit('')
    try {
      // 1. Atualiza tabela super_admins
      await sb.from('super_admins').update({
        nome: formEdit.nome,
        email: formEdit.email,
      } as never).eq('id', modalEditar.id)

      // 2. Atualiza tabela usuarios
      await sb.from('usuarios').update({
        nome: formEdit.nome,
        email: formEdit.email,
      } as never).eq('id', modalEditar.usuario_id)

      // 3. Altera nome/email/senha via API com service role
      const res = await fetch('/api/admin/atualizar-usuario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: modalEditar.usuario_id,
          nome: formEdit.nome,
          email: formEdit.email,
          senha_nova: formEdit.senha_nova || null,
        }),
      })
      const resData = await res.json()
      if (!res.ok) { setErroEdit(resData.error ?? 'Erro ao salvar.'); setSalvando(false); return }

      setModalEditar(null)
      setOk('Super admin atualizado!')
      setTimeout(() => setOk(''), 3000)
      await carregar()
    } catch (e) {
      setErroEdit(e instanceof Error ? e.message : 'Erro ao salvar.')
    }
    setSalvando(false)
  }

  async function toggleAtivo(sa: SuperAdmin) {
    if (!sa.ativo && !confirm(`Reativar ${sa.nome}?`)) return
    if (sa.ativo && !confirm(`Desativar ${sa.nome}? Ele perderá acesso ao painel admin.`)) return
    await sb.from('super_admins').update({ ativo: !sa.ativo } as never).eq('id', sa.id)
    await carregar()
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={dk.lbl}>{label}</label>
      {children}
    </div>
  )

  return (
    <div style={{ padding: 20, maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, ...dk.t1, margin: 0 }}>Super Admins</h1>
          <p style={{ fontSize: 12, ...dk.t2, marginTop: 4 }}>Usuários com acesso total ao painel administrativo</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {ok && <span style={{ fontSize: 12, color: '#3fb950' }}>{ok}</span>}
          <button onClick={() => { setModalCriar(true); setErro('') }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" /> Novo super admin
          </button>
        </div>
      </div>

      {/* Lista */}
      <div style={{ ...dk.card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0d1117' }}>
              {['Administrador', 'E-mail', 'Status', 'Desde', 'Ações'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, ...dk.t2, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #21262d' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', fontSize: 13, ...dk.t2 }}>Nenhum super admin cadastrado.</td></tr>
            )}
            {lista.map(sa => (
              <tr key={sa.id} style={{ borderBottom: '1px solid #21262d' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1c2330')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a0f3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#a78bfa', flexShrink: 0 }}>
                      {(sa.nome ?? sa.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, ...dk.t1 }}>{sa.nome ?? '—'}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, ...dk.t2 }}>{sa.email ?? '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: sa.ativo ? '#0d2b1a' : '#21262d', color: sa.ativo ? '#3fb950' : '#484f58', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                    {sa.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, ...dk.t2 }}>
                  {new Date(sa.criado_em).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => abrirEditar(sa)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '5px 10px', background: 'none', border: '1px solid #30363d', borderRadius: 5, color: '#8b949e', cursor: 'pointer' }}>
                      <i className="ti ti-pencil" style={{ fontSize: 12 }} aria-hidden="true" /> Editar
                    </button>
                    <button onClick={() => toggleAtivo(sa)}
                      style={{ fontSize: 11, padding: '5px 10px', background: 'none', border: `1px solid ${sa.ativo ? '#f85149' : '#3fb950'}40`, borderRadius: 5, color: sa.ativo ? '#f85149' : '#3fb950', cursor: 'pointer', fontWeight: 500 }}>
                      {sa.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div style={{ ...dk.card, padding: '12px 16px', marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <i className="ti ti-info-circle" style={{ fontSize: 15, color: '#58a6ff', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
        <p style={{ fontSize: 12, ...dk.t2, margin: 0, lineHeight: 1.6 }}>
          Super admins têm acesso irrestrito ao painel administrativo. Desative um usuário para revogar o acesso sem excluí-lo permanentemente. A alteração de senha afeta o próximo login.
        </p>
      </div>

      {/* ── Modal Criar ── */}
      {modalCriar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #30363d' }}>
              <span style={{ fontSize: 14, fontWeight: 600, ...dk.t1 }}>Novo super admin</span>
              <button onClick={() => setModalCriar(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...dk.t2, fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: 18 }}>
              <Field label="Nome completo *">
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} style={dk.inp} />
              </Field>
              <Field label="E-mail *">
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={dk.inp} />
              </Field>
              <Field label="Senha inicial * (mín. 6 caracteres)">
                <input type="password" value={form.senha} onChange={e => setForm(p => ({ ...p, senha: e.target.value }))} style={dk.inp} />
              </Field>
              {erro && <p style={{ fontSize: 12, color: '#f85149', margin: '0 0 12px' }}>{erro}</p>}
              <button onClick={handleCriar} disabled={salvando}
                style={{ width: '100%', padding: 10, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: salvando ? .7 : 1 }}>
                {salvando ? 'Criando...' : 'Criar super admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Editar ── */}
      {modalEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #30363d' }}>
              <span style={{ fontSize: 14, fontWeight: 600, ...dk.t1 }}>Editar — {modalEditar.nome}</span>
              <button onClick={() => setModalEditar(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', ...dk.t2, fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: 18 }}>
              <Field label="Nome completo *">
                <input value={formEdit.nome} onChange={e => setFormEdit(p => ({ ...p, nome: e.target.value }))} style={dk.inp} />
              </Field>
              <Field label="E-mail *">
                <input type="email" value={formEdit.email} onChange={e => setFormEdit(p => ({ ...p, email: e.target.value }))} style={dk.inp} />
              </Field>
              <div style={{ background: '#0d1117', borderRadius: 8, padding: '10px 14px', marginBottom: 12, border: '1px solid #21262d' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 10px' }}>Alterar senha</p>
                <Field label="Nova senha (deixe vazio para manter)">
                  <input type="password" value={formEdit.senha_nova} onChange={e => setFormEdit(p => ({ ...p, senha_nova: e.target.value }))}
                    placeholder="Mínimo 6 caracteres" style={dk.inp} />
                </Field>
                {formEdit.senha_nova && formEdit.senha_nova.length < 6 && (
                  <p style={{ fontSize: 11, color: '#f59e0b', margin: '-6px 0 0' }}>Mínimo 6 caracteres</p>
                )}
              </div>
              {erroEdit && <p style={{ fontSize: 12, color: '#f85149', margin: '0 0 12px' }}>{erroEdit}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setModalEditar(null)}
                  style={{ flex: 1, padding: 10, background: 'none', border: '1px solid #30363d', borderRadius: 6, color: '#8b949e', fontSize: 13, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSalvarEdicao} disabled={salvando || !formEdit.nome || !formEdit.email}
                  style={{ flex: 2, padding: 10, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: salvando ? .7 : 1 }}>
                  {salvando ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
