'use client'

import { useState } from 'react'

interface Props {
  cotacaoId: string
  razaoSocial?: string
  contatoNome?: string
  contatoEmail?: string
  assinaturaStatus?: string | null
  assinaturaLink?: string | null
  onClose: () => void
  onEnviado: () => void
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
  border: '1px solid var(--border-color)', background: 'var(--bg-page)',
  color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)',
  textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5,
}

export function AssinaturaModal({ cotacaoId, contatoNome, contatoEmail, assinaturaStatus, assinaturaLink, onClose, onEnviado }: Props) {
  const [email, setEmail] = useState(contatoEmail ?? '')
  const [nome, setNome] = useState(contatoNome ?? '')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [link, setLink] = useState(assinaturaLink ?? '')
  const [enviado, setEnviado] = useState(!!assinaturaStatus && assinaturaStatus !== 'expirado')

  async function handleEnviar() {
    if (!email) { setErro('Informe o e-mail do signatário.'); return }
    setErro(''); setEnviando(true)
    try {
      const res = await fetch('/api/assinatura', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotacao_id: cotacaoId, signatario_email: email, signatario_nome: nome }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? 'Erro ao enviar.') }
      else { setLink(data.link); setEnviado(true); onEnviado() }
    } catch { setErro('Erro de conexão. Tente novamente.') }
    setEnviando(false)
  }

  const statusAtual = assinaturaStatus ?? (enviado ? 'pendente' : null)
  const STATUS: Record<string, { label: string; bg: string; color: string; icon: string }> = {
    pendente: { label: 'Aguardando assinatura', bg: '#fffbeb', color: '#d97706', icon: 'ti-clock' },
    assinado: { label: 'Documento assinado', bg: '#f0fdf4', color: '#16a34a', icon: 'ti-circle-check' },
    recusado: { label: 'Assinatura recusada', bg: '#fef2f2', color: '#dc2626', icon: 'ti-circle-x' },
    expirado: { label: 'Link expirado', bg: '#f8fafc', color: '#64748b', icon: 'ti-clock-off' },
  }
  const st = statusAtual ? STATUS[statusAtual] : null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.6)', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: statusAtual === 'assinado' ? '#dcfce7' : '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-signature" style={{ fontSize: 20, color: statusAtual === 'assinado' ? '#16a34a' : '#9333ea' }} aria-hidden="true" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Assinatura digital</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>Assinar eletronicamente o QAR</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 22, padding: 4, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Status atual */}
          {st && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: st.bg, borderRadius: 8, border: `1px solid ${st.color}30` }}>
              <i className={`ti ${st.icon}`} style={{ fontSize: 16, color: st.color }} aria-hidden="true" />
              <span style={{ fontSize: 13, fontWeight: 500, color: st.color }}>{st.label}</span>
            </div>
          )}

          {/* Link de acompanhamento */}
          {link && (
            <div style={{ background: 'var(--bg-page)', borderRadius: 8, padding: '12px 14px' }}>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 6px' }}>Link do documento:</p>
              <a href={link} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: 'var(--accent)', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-external-link" style={{ fontSize: 12, flexShrink: 0 }} aria-hidden="true" />
                {link}
              </a>
            </div>
          )}

          {/* Formulário de envio */}
          {!enviado && (
            <>
              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#7e22ce', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Como funciona:</p>
                {['PDF enviado automaticamente para plataforma de assinatura', 'Signatário recebe e-mail com link para assinar', 'Status atualizado automaticamente após assinatura'].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9333ea', flexShrink: 0 }}>{i + 1}.</span>
                    <p style={{ fontSize: 12, color: '#7e22ce', margin: 0 }}>{t}</p>
                  </div>
                ))}
              </div>

              <div>
                <label style={lbl}>Nome do signatário</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" style={inp} />
              </div>

              <div>
                <label style={lbl}>E-mail do signatário *</label>
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErro('') }} placeholder="email@empresa.com.br" style={inp} />
              </div>

              {erro && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8 }}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 15, color: '#ef4444', flexShrink: 0 }} aria-hidden="true" />
                  <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{erro}</p>
                </div>
              )}

              <button onClick={handleEnviar} disabled={enviando || !email}
                style={{ width: '100%', padding: 11, background: enviando || !email ? '#94a3b8' : '#9333ea', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: enviando || !email ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <i className={`ti ${enviando ? 'ti-loader-2' : 'ti-signature'}`} style={{ fontSize: 15 }} aria-hidden="true" />
                {enviando ? 'Enviando...' : 'Enviar para assinatura'}
              </button>
            </>
          )}

          {enviado && statusAtual !== 'assinado' && (
            <button onClick={() => { setEnviado(false); setLink('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-3)', padding: 4 }}>
              Reenviar para outro signatário
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
