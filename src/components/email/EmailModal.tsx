'use client'

import { useState } from 'react'

interface Props {
  cotacaoId: string
  destinatarioNomePadrao?: string
  destinatarioEmailPadrao?: string
  onClose: () => void
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

export function EmailModal({ cotacaoId, destinatarioNomePadrao, destinatarioEmailPadrao, onClose }: Props) {
  const [email, setEmail] = useState(destinatarioEmailPadrao ?? '')
  const [nome, setNome] = useState(destinatarioNomePadrao ?? '')
  const [enviando, setEnviando] = useState(false)
  const [status, setStatus] = useState<'idle' | 'ok' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')
  const [remetente, setRemetente] = useState('')

  async function handleEnviar() {
    if (!email) { setErroMsg('Informe o e-mail do destinatário.'); setStatus('erro'); return }
    setEnviando(true); setStatus('idle'); setErroMsg('')
    try {
      const res = await fetch('/api/enviar-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotacao_id: cotacaoId, destinatario_email: email, destinatario_nome: nome }),
      })
      const data = await res.json()
      if (!res.ok) { setErroMsg(data.error ?? 'Erro ao enviar.'); setStatus('erro') }
      else { setRemetente(data.remetente); setStatus('ok') }
    } catch { setErroMsg('Erro de conexão.'); setStatus('erro') }
    setEnviando(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.6)', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-mail" style={{ fontSize: 18, color: '#7c3aed' }} aria-hidden="true" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Enviar por e-mail</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>PDF do QAR em anexo</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {status === 'ok' ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <i className="ti ti-circle-check" style={{ fontSize: 26, color: '#16a34a' }} aria-hidden="true" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 6px' }}>E-mail enviado!</p>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 4px' }}>De: {remetente}</p>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 20px' }}>Para: {email}</p>
              <button onClick={onClose} style={{ padding: '9px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Fechar
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Nome do destinatário</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da transportadora ou contato" style={inp} />
              </div>
              <div>
                <label style={lbl}>E-mail do destinatário *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@transportadora.com.br" style={inp} />
              </div>

              {/* O que será enviado */}
              <div style={{ background: 'var(--bg-page)', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 8px' }}>O e-mail vai conter:</p>
                {['Template com dados da cotação (empresa, CNPJ, ramo, importância segurada)', 'PDF do QAR completo em anexo', 'Enviado pelo e-mail configurado (seu perfil ou e-mail da corretora)'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 5 }} />
                    <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>{t}</p>
                  </div>
                ))}
              </div>

              {status === 'erro' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8 }}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 15, color: '#ef4444', flexShrink: 0 }} aria-hidden="true" />
                  <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{erroMsg}</p>
                </div>
              )}

              <button onClick={handleEnviar} disabled={enviando || !email}
                style={{ width: '100%', padding: '11px', background: enviando || !email ? '#94a3b8' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: enviando || !email ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <i className={`ti ${enviando ? 'ti-loader-2' : 'ti-send'}`} style={{ fontSize: 15 }} aria-hidden="true" />
                {enviando ? 'Enviando...' : 'Enviar e-mail com PDF'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
