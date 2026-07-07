'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessao } from '@/hooks/useSessao'
import { createClient } from '@/lib/supabase/client'

export default function PerfilPage() {
  const router = useRouter()
  const { usuario, corretora, papel } = useSessao()
  const supabase = createClient()

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [mostrarSenhas, setMostrarSenhas] = useState(false)

  // Nome editável
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [nomeOk, setNomeOk] = useState('')

  const iniciais = usuario?.nome?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? '?'

  const PAPEL_LABEL: Record<string, { label: string; bg: string; text: string }> = {
    admin:        { label: 'Administrador', bg: 'var(--status-pending-bg)',  text: 'var(--status-pending-text)' },
    aprovador:    { label: 'Aprovador',     bg: 'var(--status-sent-bg)',     text: 'var(--status-sent-text)' },
    corretor:     { label: 'Corretor',      bg: 'var(--status-approved-bg)', text: 'var(--status-approved-text)' },
    visualizador: { label: 'Visualizador',  bg: 'var(--status-draft-bg)',    text: 'var(--status-draft-text)' },
    super_admin:  { label: 'Super Admin',   bg: '#1a0f3c', text: '#a78bfa' },
  }

  const papelInfo = PAPEL_LABEL[papel ?? ''] ?? PAPEL_LABEL.corretor

  async function handleSalvarNome() {
    if (!nome.trim() || !usuario) return
    setSalvandoNome(true)
    const { error } = await supabase
      .from('usuarios')
      .update({ nome: nome.trim() } as never)
      .eq('id', usuario.id)
    if (error) {
      setNomeOk('')
    } else {
      setNomeOk('Nome atualizado com sucesso.')
      setTimeout(() => setNomeOk(''), 3000)
    }
    setSalvandoNome(false)
  }

  async function handleAlterarSenha() {
    setErro(''); setOk('')

    if (!senhaAtual) { setErro('Informe sua senha atual.'); return }
    if (!novaSenha)  { setErro('Informe a nova senha.'); return }
    if (novaSenha.length < 6) { setErro('A nova senha deve ter pelo menos 6 caracteres.'); return }
    if (novaSenha !== confirmarSenha) { setErro('As senhas não coincidem.'); return }
    if (novaSenha === senhaAtual) { setErro('A nova senha deve ser diferente da senha atual.'); return }

    setSalvando(true)
    try {
      // 1. Reautentica com a senha atual para verificar
      const { error: reautError } = await supabase.auth.signInWithPassword({
        email: usuario?.email ?? '',
        password: senhaAtual,
      })
      if (reautError) {
        setErro('Senha atual incorreta.')
        setSalvando(false)
        return
      }

      // 2. Atualiza para a nova senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha,
      })
      if (updateError) {
        setErro(`Erro ao alterar senha: ${updateError.message}`)
      } else {
        setOk('Senha alterada com sucesso!')
        setSenhaAtual('')
        setNovaSenha('')
        setConfirmarSenha('')
        setMostrarSenhas(false)
        setTimeout(() => setOk(''), 5000)
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    }
    setSalvando(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 6,
    fontSize: 13,
    color: 'var(--text-1)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-2)',
    marginBottom: 5,
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 10,
    marginBottom: 14,
    overflow: 'hidden',
  }

  const cardHeader: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 16px',
    borderBottom: '1px solid var(--border-color)',
  }

  return (
    <div style={{ padding: 20, maxWidth: 560, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.back()}
          style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0 }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 15 }} aria-hidden="true" />
        </button>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Meu perfil</h1>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>Informações da conta e segurança</p>
        </div>
      </div>

      {/* Avatar + identidade */}
      <div style={cardStyle}>
        <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {iniciais}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {usuario?.nome ?? '—'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {usuario?.email ?? '—'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ background: papelInfo.bg, color: papelInfo.text, padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                {papelInfo.label}
              </span>
              {corretora && (
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  · {corretora.nome_exibicao ?? corretora.nome}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dados pessoais */}
      <div style={cardStyle}>
        <div style={cardHeader}>
          <i className="ti ti-user" style={{ fontSize: 15, color: 'var(--text-2)' }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Dados pessoais</span>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Nome completo</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Seu nome completo" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={handleSalvarNome} disabled={salvandoNome || nome.trim() === usuario?.nome}
                style={{ padding: '9px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', opacity: (salvandoNome || nome.trim() === usuario?.nome) ? .5 : 1 }}>
                {salvandoNome ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
            {nomeOk && <p style={{ fontSize: 12, color: '#059669', marginTop: 6 }}>✓ {nomeOk}</p>}
          </div>
          <div>
            <label style={labelStyle}>E-mail</label>
            <input value={usuario?.email ?? ''} disabled
              style={{ ...inputStyle, opacity: .6, cursor: 'not-allowed' }} />
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              O e-mail não pode ser alterado diretamente. Entre em contato com o administrador.
            </p>
          </div>
        </div>
      </div>

      {/* Alterar senha */}
      <div style={cardStyle}>
        <div style={{ ...cardHeader, justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => { setMostrarSenhas(!mostrarSenhas); setErro(''); setOk('') }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-lock" style={{ fontSize: 15, color: 'var(--text-2)' }} aria-hidden="true" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Alterar senha</span>
          </div>
          <i className={`ti ${mostrarSenhas ? 'ti-chevron-up' : 'ti-chevron-down'}`}
            style={{ fontSize: 16, color: 'var(--text-3)' }} aria-hidden="true" />
        </div>

        {mostrarSenhas && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'var(--accent-light)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <i className="ti ti-info-circle" style={{ fontSize: 14, color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <p style={{ fontSize: 12, color: 'var(--accent-text)', margin: 0, lineHeight: 1.5 }}>
                Por segurança, confirme sua senha atual antes de definir uma nova.
              </p>
            </div>

            <div>
              <label style={labelStyle}>Senha atual *</label>
              <input type="password" value={senhaAtual} onChange={e => { setSenhaAtual(e.target.value); setErro('') }}
                placeholder="Digite sua senha atual" style={inputStyle} />
            </div>

            <div style={{ height: 1, background: 'var(--border-color)' }} />

            <div>
              <label style={labelStyle}>Nova senha * <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(mínimo 6 caracteres)</span></label>
              <input type="password" value={novaSenha} onChange={e => { setNovaSenha(e.target.value); setErro('') }}
                placeholder="Digite a nova senha" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Confirmar nova senha *</label>
              <input type="password" value={confirmarSenha} onChange={e => { setConfirmarSenha(e.target.value); setErro('') }}
                placeholder="Repita a nova senha" style={inputStyle} />
            </div>

            {/* Indicador de força */}
            {novaSenha && (
              <div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {[
                    novaSenha.length >= 6,
                    /[A-Z]/.test(novaSenha),
                    /[0-9]/.test(novaSenha),
                    /[^A-Za-z0-9]/.test(novaSenha),
                  ].map((ok, i) => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: ok ? (i < 2 ? '#f59e0b' : '#059669') : 'var(--border-color)', transition: 'background .2s' }} />
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                  {novaSenha.length < 6 ? 'Muito curta' :
                   !/[A-Z]/.test(novaSenha) ? 'Adicione letras maiúsculas' :
                   !/[0-9]/.test(novaSenha) ? 'Adicione números' :
                   !/[^A-Za-z0-9]/.test(novaSenha) ? 'Boa — adicione símbolos para senha forte' :
                   '✓ Senha forte'}
                </p>
              </div>
            )}

            {/* Coincidência */}
            {confirmarSenha && novaSenha !== confirmarSenha && (
              <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>
                <i className="ti ti-x" style={{ fontSize: 12 }} /> As senhas não coincidem
              </p>
            )}
            {confirmarSenha && novaSenha === confirmarSenha && novaSenha.length >= 6 && (
              <p style={{ fontSize: 12, color: '#059669', margin: 0 }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> Senhas coincidem
              </p>
            )}

            {erro && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: '#dc2626' }}>
                {erro}
              </div>
            )}
            {ok && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-circle-check" style={{ fontSize: 15, color: '#059669' }} aria-hidden="true" />
                {ok}
              </div>
            )}

            <button onClick={handleAlterarSenha} disabled={salvando || !senhaAtual || !novaSenha || !confirmarSenha || novaSenha !== confirmarSenha}
              style={{ padding: '10px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (salvando || !senhaAtual || !novaSenha || !confirmarSenha || novaSenha !== confirmarSenha) ? .5 : 1, transition: 'opacity .15s' }}>
              <i className="ti ti-lock-check" style={{ fontSize: 14 }} aria-hidden="true" />
              {salvando ? 'Alterando senha...' : 'Confirmar nova senha'}
            </button>
          </div>
        )}
      </div>

      {/* Sessão */}
      <div style={cardStyle}>
        <div style={cardHeader}>
          <i className="ti ti-device-laptop" style={{ fontSize: 15, color: 'var(--text-2)' }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Sessão atual</span>
        </div>
        <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-1)', margin: '0 0 3px', fontWeight: 500 }}>Navegador web</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>Sessão ativa agora</p>
          </div>
          <button
            onClick={async () => {
              const sb = createClient()
              await sb.auth.signOut()
              window.location.href = '/auth/login'
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-2)', fontSize: 12, cursor: 'pointer' }}>
            <i className="ti ti-logout" style={{ fontSize: 13 }} aria-hidden="true" />
            Encerrar sessão
          </button>
        </div>
      </div>
    </div>
  )
}
