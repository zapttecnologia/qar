'use client'

import { useState } from 'react'

interface Props {
  cotacaoId: string
  razaoSocial?: string
  cnpj?: string
  ramo?: string
  contatoNome?: string
  contatoTelefone?: string
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

function formatarTelefone(tel: string): string {
  const d = tel.replace(/\D/g, '')
  return d.startsWith('55') ? d : `55${d}`
}

export function WhatsAppModal({ cotacaoId, razaoSocial, cnpj, ramo, contatoNome, contatoTelefone, onClose }: Props) {
  const [telefone, setTelefone] = useState(contatoTelefone ?? '')
  const [etapa, setEtapa] = useState<'form' | 'baixando' | 'pronto'>('form')
  const [erro, setErro] = useState('')

  function montarMensagem() {
    return `Olá${contatoNome ? `, *${contatoNome}*` : ''}! 👋\n\nSegue o *QAR (Questionário de Avaliação de Riscos)* para cotação de seguro de transportes.\n\n📋 *Dados:*\n• Empresa: ${razaoSocial ?? '—'}\n• CNPJ: ${cnpj ?? '—'}\n• Ramo: ${ramo ?? '—'}\n\nO PDF está em anexo. Qualquer dúvida, estou à disposição!`
  }

  async function handleEnviar() {
    const digits = telefone.replace(/\D/g, '')
    if (digits.length < 10) { setErro('Informe um telefone válido com DDD.'); return }
    setErro(''); setEtapa('baixando')
    try {
      const [{ pdf }, { QarPDF }, { buscarCotacao }, { buscarTabelasFilhas }, { createClient }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/QarPDF'),
        import('@/lib/queries/cotacoes'),
        import('@/lib/queries/cotacoes_qar'),
        import('@/lib/supabase/client'),
      ])
      const sb = createClient()
      const cotacao = await buscarCotacao(cotacaoId) as Record<string, unknown>
      const { data: corretora } = await sb.from('corretoras').select('nome, nome_exibicao, logo_url, cor_primaria, cor_secundaria, site_url').eq('id', cotacao.corretora_id as string).single()
      const filhas = await buscarTabelasFilhas(cotacaoId)
      const blob = await pdf(QarPDF({ corretora: corretora ?? { nome: 'Corretora' }, cotacao: cotacao as never, mercadorias: filhas.mercadorias as never, percursos: filhas.percursos as never, expAnterior: filhas.experiencia as never, condicaoAtual: filhas.condicaoAtual as never, sinistros: filhas.sinistros as never, ddrs: filhas.ddrs as never, gerenciadoras: filhas.gerenciadoras as never, condPretendidas: filhas.condPretendidas as never })).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `QAR-${(razaoSocial ?? cnpj ?? 'cotacao').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.pdf`; a.click()
      URL.revokeObjectURL(url)
      setEtapa('pronto')
    } catch { setErro('Erro ao gerar PDF.'); setEtapa('form') }
  }

  function handleAbrirWhatsApp() {
    window.open(`https://wa.me/${formatarTelefone(telefone)}?text=${encodeURIComponent(montarMensagem())}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.6)', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-brand-whatsapp" style={{ fontSize: 20, color: '#16a34a' }} aria-hidden="true" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Enviar pelo WhatsApp</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>PDF + mensagem pré-preenchida</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 22, padding: 4, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 20 }}>

          {etapa === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Número do WhatsApp *</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ padding: '9px 12px', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13, color: 'var(--text-2)', flexShrink: 0 }}>🇧🇷 +55</span>
                  <input type="tel" value={telefone} onChange={e => { setTelefone(e.target.value); setErro('') }} placeholder="(11) 99999-9999" style={{ ...inp, flex: 1 }} />
                </div>
                {contatoTelefone && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Cadastrado: {contatoTelefone}</p>}
                {erro && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{erro}</p>}
              </div>

              <div>
                <label style={lbl}>Preview da mensagem</label>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ fontSize: 12, color: '#166534', whiteSpace: 'pre-line', lineHeight: 1.6, margin: 0 }}>{montarMensagem()}</p>
                </div>
              </div>

              <div style={{ background: 'var(--bg-page)', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 8px' }}>Como funciona:</p>
                {['PDF do QAR será baixado automaticamente', 'WhatsApp Web abrirá com mensagem pronta', 'Anexe o PDF e envie'].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>{t}</p>
                  </div>
                ))}
              </div>

              <button onClick={handleEnviar} disabled={!telefone}
                style={{ width: '100%', padding: 11, background: !telefone ? '#94a3b8' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: !telefone ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <i className="ti ti-download" style={{ fontSize: 15 }} aria-hidden="true" />
                Baixar PDF e preparar WhatsApp
              </button>
            </div>
          )}

          {etapa === 'baixando' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ width: 40, height: 40, border: '3px solid #16a34a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 14px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 4px' }}>Gerando PDF...</p>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>O download vai iniciar automaticamente.</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {etapa === 'pronto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 26, color: '#16a34a' }} aria-hidden="true" />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 4px' }}>PDF baixado!</p>
                <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>Verifique sua pasta de Downloads.</p>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                  📎 No WhatsApp Web, clique no ícone de clipe → Documento → selecione o PDF antes de enviar.
                </p>
              </div>
              <button onClick={handleAbrirWhatsApp}
                style={{ width: '100%', padding: 11, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <i className="ti ti-brand-whatsapp" style={{ fontSize: 16 }} aria-hidden="true" />
                Abrir WhatsApp Web
              </button>
              <button onClick={() => setEtapa('form')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-3)', padding: 4 }}>
                Voltar e alterar número
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
