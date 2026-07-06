'use client'

import { useState } from 'react'
import { X, Download, MessageCircle, Loader2, CheckCircle, Phone } from 'lucide-react'

interface Props {
  cotacaoId: string
  razaoSocial?: string
  cnpj?: string
  ramo?: string
  contatoNome?: string
  contatoTelefone?: string
  onClose: () => void
}

function formatarTelefone(tel: string): string {
  // Remove tudo exceto números
  const digits = tel.replace(/\D/g, '')
  // Adiciona DDI 55 se não tiver
  if (digits.startsWith('55')) return digits
  return `55${digits}`
}

function validarTelefone(tel: string): boolean {
  const digits = tel.replace(/\D/g, '')
  // Mínimo 10 dígitos (DDD + número) sem DDI
  return digits.length >= 10 && digits.length <= 13
}

export function WhatsAppModal({
  cotacaoId, razaoSocial, cnpj, ramo,
  contatoNome, contatoTelefone, onClose
}: Props) {
  const [telefone, setTelefone] = useState(contatoTelefone ?? '')
  const [etapa, setEtapa] = useState<'form' | 'baixando' | 'pronto'>('form')
  const [erro, setErro] = useState('')

  function montarMensagem(): string {
    const empresa = razaoSocial ?? 'sua empresa'
    const nomeContato = contatoNome ? `*${contatoNome}*` : 'prezado(a)'

    return `Olá, ${nomeContato}! 👋

Segue em anexo o *Questionário de Avaliação de Riscos (QAR)* referente à cotação de seguro de transportes de carga para *${empresa}*.

📋 *Dados da cotação:*
• Empresa: ${razaoSocial ?? '—'}
• CNPJ: ${cnpj ?? '—'}
• Ramo: ${ramo ?? '—'}

O PDF com o QAR completo está em anexo. Por favor, revise as informações e entre em contato caso tenha dúvidas ou precise de ajustes.

Qualquer dúvida, estou à disposição! 😊`
  }

  async function handleEnviar() {
    if (!validarTelefone(telefone)) {
      setErro('Informe um número de telefone válido com DDD (ex: 11 99999-9999).')
      return
    }
    setErro('')
    setEtapa('baixando')

    try {
      // 1. Gera e baixa o PDF
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
      const cotacao = await buscarCotacao(cotacaoId) as Record<string, unknown>
      const { data: corretora } = await supabase
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

      // 2. Dispara o download do PDF
      const url = URL.createObjectURL(blob)
      const nomeArquivo = `QAR-${(razaoSocial ?? cnpj ?? 'cotacao').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.pdf`
      const a = document.createElement('a')
      a.href = url
      a.download = nomeArquivo
      a.click()
      URL.revokeObjectURL(url)

      setEtapa('pronto')
    } catch (e) {
      console.error(e)
      setErro('Erro ao gerar o PDF. Tente novamente.')
      setEtapa('form')
    }
  }

  function handleAbrirWhatsApp() {
    const numero = formatarTelefone(telefone)
    const mensagem = encodeURIComponent(montarMensagem())
    window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <MessageCircle className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Enviar pelo WhatsApp</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5">

          {/* ETAPA 1 — Formulário */}
          {etapa === 'form' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  Número do WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 flex-shrink-0">
                    🇧🇷 +55
                  </span>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={e => {
                      setTelefone(e.target.value)
                      setErro('')
                    }}
                    placeholder="(11) 99999-9999"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                {contatoTelefone && (
                  <p className="text-xs text-gray-400 mt-1">
                    Contato cadastrado: {contatoTelefone}
                  </p>
                )}
                {erro && <p className="text-xs text-red-500 mt-1">{erro}</p>}
              </div>

              {/* Preview da mensagem */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Preview da mensagem:</p>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                    {montarMensagem()}
                  </p>
                </div>
              </div>

              {/* Instruções do fluxo */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">O que vai acontecer:</p>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center flex-shrink-0 font-medium">1</span>
                  <p className="text-xs text-gray-500">O PDF do QAR será <strong>baixado automaticamente</strong> no seu computador</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center flex-shrink-0 font-medium">2</span>
                  <p className="text-xs text-gray-500">O <strong>WhatsApp Web</strong> abrirá com a mensagem pré-preenchida</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center flex-shrink-0 font-medium">3</span>
                  <p className="text-xs text-gray-500">Anexe o PDF baixado e envie</p>
                </div>
              </div>

              <button
                onClick={handleEnviar}
                disabled={!telefone}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-500 disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar PDF e preparar WhatsApp
              </button>
            </div>
          )}

          {/* ETAPA 2 — Baixando */}
          {etapa === 'baixando' && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-green-500 animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Gerando PDF...</p>
              <p className="text-xs text-gray-500">O download vai iniciar automaticamente em seguida.</p>
            </div>
          )}

          {/* ETAPA 3 — Pronto para abrir WhatsApp */}
          {etapa === 'pronto' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">PDF baixado com sucesso!</p>
                <p className="text-xs text-gray-500">
                  Verifique a pasta de Downloads do seu computador.<br />
                  Agora abra o WhatsApp e anexe o arquivo.
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">📎 Lembre-se:</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  No WhatsApp Web, clique no ícone de clipe (📎) → Documento → selecione o PDF baixado antes de enviar.
                </p>
              </div>

              <button
                onClick={handleAbrirWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-500 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Abrir WhatsApp Web
              </button>

              <button
                onClick={() => setEtapa('form')}
                className="w-full py-2 text-xs text-gray-400 hover:text-gray-600"
              >
                Voltar e alterar número
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
