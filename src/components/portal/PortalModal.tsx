'use client'

import { useState } from 'react'

interface Props {
  cotacaoId: string
  contatoNome?: string
  contatoEmail?: string
  portalStatus?: string | null
  onClose: () => void
  onEnviado: () => void
}

const STATUS_INFO: Record<string, { label: string; cor: string; icon: string }> = {
  enviado:           { label: 'Link enviado — aguardando acesso',   cor: '#f59e0b', icon: 'ti-clock' },
  visualizado:       { label: 'Transportadora visualizou o QAR',    cor: '#3b82f6', icon: 'ti-eye' },
  confirmado:        { label: 'Dados confirmados pela transportadora', cor: '#059669', icon: 'ti-circle-check' },
  ajuste_solicitado: { label: 'Ajuste solicitado pela transportadora', cor: '#dc2626', icon: 'ti-message' },
}

export function PortalModal({ cotacaoId, contatoNome, contatoEmail, portalStatus, onClose, onEnviado }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [portalUrl, setPortalUrl] = useState('')

  const statusInfo = portalStatus ? STATUS_INFO[portalStatus] : null

  async function handleEnviar() {
    setEnviando(true); setErro('')
    try {
      const res = await fetch('/api/portal/enviar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotacao_id: cotacaoId }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? 'Erro ao enviar.'); setEnviando(false); return }
      setPortalUrl(data.portal_url)
      setEnviado(true)
      onEnviado()
    } catch { setErro('Erro de conexão.') }
    setEnviando(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.6)', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0f2744', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-world" style={{ fontSize: 14, color: '#58a5f0' }} aria-hidden="true" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Portal da transportadora</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>portal.qartech.com.br</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
            <i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden="true" />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Status atual */}
          {statusInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: `${statusInfo.cor}15`, border: `1px solid ${statusInfo.cor}40`, borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
              <i className={`ti ${statusInfo.icon}`} style={{ fontSize: 15, color: statusInfo.cor }} aria-hidden="true" />
              <p style={{ fontSize: 12, color: statusInfo.cor, fontWeight: 500, margin: 0 }}>{statusInfo.label}</p>
            </div>
          )}

          {!enviado ? (
            <>
              {/* Info do destinatário */}
              <div style={{ background: 'var(--bg-page)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Será enviado para</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--accent-text)' }}>
                    {contatoNome?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', margin: 0 }}>{contatoNome ?? '—'}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{contatoEmail ?? 'E-mail não cadastrado'}</p>
                  </div>
                </div>
              </div>

              {/* Fluxo */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Como funciona</p>
                {[
                  ['ti-mail', 'Transportadora recebe e-mail com link seguro'],
                  ['ti-shield-check', 'Confirma CNPJ + código enviado por e-mail'],
                  ['ti-file-certificate', 'Acessa o QAR completo para revisar'],
                  ['ti-circle-check', 'Confirma os dados ou solicita ajuste'],
                ].map(([icon, texto]) => (
                  <div key={texto} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <i className={`ti ${icon}`} style={{ fontSize: 14, color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                    <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.4 }}>{texto}</p>
                  </div>
                ))}
              </div>

              {!contatoEmail && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: '#dc2626' }}>
                  ⚠️ Esta cotação não tem e-mail de contato cadastrado. Adicione um e-mail no cadastro da transportadora.
                </div>
              )}

              {erro && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>{erro}</p>}

              <button onClick={handleEnviar} disabled={enviando || !contatoEmail}
                style={{ width: '100%', padding: '11px', background: '#0f2744', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: !contatoEmail ? 'not-allowed' : 'pointer', opacity: !contatoEmail ? .5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <i className="ti ti-send" style={{ fontSize: 14 }} aria-hidden="true" />
                {enviando ? 'Enviando...' : portalStatus ? 'Reenviar link do portal' : 'Enviar link do portal'}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 48, height: 48, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <i className="ti ti-circle-check" style={{ fontSize: 24, color: '#059669' }} aria-hidden="true" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>Link enviado!</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.5 }}>
                {contatoNome} receberá o e-mail com o link seguro para acessar o QAR.
              </p>
              {portalUrl && (
                <div style={{ background: 'var(--bg-page)', borderRadius: 6, padding: '10px 12px', marginBottom: 14 }}>
                  <p style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>Link gerado</p>
                  <a href={portalUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: 'var(--accent)', wordBreak: 'break-all' }}>
                    {portalUrl}
                  </a>
                </div>
              )}
              <button onClick={onClose}
                style={{ padding: '9px 20px', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-2)' }}>
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
