'use client'

import { useEffect, useState } from 'react'

interface Props {
  cotacaoId: string
  onClose: () => void
}

export function PDFPreviewModal({ cotacaoId, onClose }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    gerarPDF()
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) }
  }, [cotacaoId])

  async function gerarPDF() {
    setCarregando(true)
    setErro('')
    setPdfUrl(null)
    try {
      const [
        { pdf },
        { QarPDF },
        { buscarCotacao },
        { buscarTabelasFilhas },
        { createClient },
      ] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/QarPDF'),
        import('@/lib/queries/cotacoes'),
        import('@/lib/queries/cotacoes_qar'),
        import('@/lib/supabase/client'),
      ])

      const sb = createClient()
      const cotacao = await buscarCotacao(cotacaoId) as Record<string, unknown>
      if (!cotacao) { setErro('Cotação não encontrada.'); setCarregando(false); return }

      const { data: corretora } = await sb
        .from('corretoras')
        .select('nome, nome_exibicao, logo_url, cor_primaria, cor_secundaria, site_url')
        .eq('id', cotacao.corretora_id as string)
        .single()

      const filhas = await buscarTabelasFilhas(cotacaoId)

      const blob = await pdf(
        QarPDF({
          corretora: corretora ?? { nome: 'Corretora' },
          cotacao: cotacao as never,
          mercadorias: filhas.mercadorias as never,
          percursos: filhas.percursos as never,
          expAnterior: filhas.experiencia as never,
          condicaoAtual: filhas.condicaoAtual as never,
          sinistros: filhas.sinistros as never,
          ddrs: filhas.ddrs as never,
          gerenciadoras: filhas.gerenciadoras as never,
          condPretendidas: filhas.condPretendidas as never,
        })
      ).toBlob()

      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (e) {
      console.error('[PDF]', e)
      setErro('Erro ao gerar PDF. Verifique se todos os dados da cotação estão preenchidos.')
    }
    setCarregando(false)
  }

  function handleImprimir() {
    if (!pdfUrl) return
    const win = window.open(pdfUrl)
    win?.addEventListener('load', () => win.print())
  }

  function handleBaixar() {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `QAR-${cotacaoId}.pdf`
    a.click()
  }

  const btnSecundario: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
    borderRadius: 7, border: '1px solid var(--border-color)', background: 'none',
    fontSize: 12, color: 'var(--text-2)', cursor: 'pointer',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.6)', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, width: '100%', maxWidth: 900, display: 'flex', flexDirection: 'column', height: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-file-invoice" style={{ fontSize: 18, color: '#d97706' }} aria-hidden="true" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>
              Preview — QAR Seguro de Transportes
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pdfUrl && (
              <>
                <button onClick={handleImprimir} style={btnSecundario}>
                  <i className="ti ti-printer" style={{ fontSize: 14 }} aria-hidden="true" /> Imprimir
                </button>
                <button onClick={handleBaixar} style={{ ...btnSecundario, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600 }}>
                  <i className="ti ti-download" style={{ fontSize: 14 }} aria-hidden="true" /> Baixar PDF
                </button>
              </>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 24, padding: 4, marginLeft: 4, lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1, overflow: 'hidden', background: 'var(--bg-page)', borderRadius: '0 0 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {carregando && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 14px' }} />
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>Gerando PDF...</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
          {erro && !carregando && (
            <div style={{ textAlign: 'center', maxWidth: 340 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 24, color: '#ef4444' }} aria-hidden="true" />
              </div>
              <p style={{ fontSize: 13, color: '#ef4444', margin: '0 0 16px' }}>{erro}</p>
              <button onClick={gerarPDF}
                style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Tentar novamente
              </button>
            </div>
          )}
          {pdfUrl && !carregando && (
            <iframe src={pdfUrl} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '0 0 16px 16px' }} title="Preview QAR" />
          )}
        </div>
      </div>
    </div>
  )
}
