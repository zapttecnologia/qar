'use client'

import { useState, useEffect } from 'react'
import { X, Download, Printer } from 'lucide-react'

interface Props {
  cotacaoId: string
  onClose: () => void
}

export function PDFPreviewModal({ cotacaoId, onClose }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [gerando, setGerando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    gerarPDF()
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [cotacaoId])

  async function gerarPDF() {
    setGerando(true)
    setErro('')
    try {
      // Importação dinâmica para evitar SSR (react-pdf só roda no browser)
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

      const supabase = createClient()

      // Busca cotação + corretora
      const cotacao = await buscarCotacao(cotacaoId) as Record<string, unknown>
      const { data: corretora } = await supabase
        .from('corretoras')
        .select('nome, nome_exibicao, logo_url, cor_primaria, cor_secundaria, site_url')
        .eq('id', cotacao.corretora_id as string)
        .single()

      // Busca tabelas filhas
      const filhas = await buscarTabelasFilhas(cotacaoId)

      // Gera o PDF
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
      console.error(e)
      setErro('Erro ao gerar o PDF. Tente novamente.')
    }
    setGerando(false)
  }

  function handleDownload() {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `QAR-${cotacaoId.slice(0, 8).toUpperCase()}.pdf`
    a.click()
  }

  function handleImprimir() {
    if (!pdfUrl) return
    const win = window.open(pdfUrl)
    win?.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ height: '90vh' }}>

        {/* Header do modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Preview — QAR Seguro de Transportes</h2>
          <div className="flex items-center gap-2">
            {pdfUrl && (
              <>
                <button
                  onClick={handleImprimir}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar PDF
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ml-1">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-b-2xl">
          {gerando && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Gerando PDF...</p>
              </div>
            </div>
          )}

          {erro && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-red-500 mb-3">{erro}</p>
                <button onClick={gerarPDF} className="text-sm text-blue-600 hover:underline">Tentar novamente</button>
              </div>
            </div>
          )}

          {pdfUrl && !gerando && (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-b-2xl"
              title="Preview QAR"
            />
          )}
        </div>
      </div>
    </div>
  )
}
