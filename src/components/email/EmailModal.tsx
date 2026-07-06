'use client'

import { useState } from 'react'
import { X, Send, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  cotacaoId: string
  destinatarioNomePadrao?: string
  destinatarioEmailPadrao?: string
  onClose: () => void
}

export function EmailModal({ cotacaoId, destinatarioNomePadrao, destinatarioEmailPadrao, onClose }: Props) {
  const [destinatarioEmail, setDestinatarioEmail] = useState(destinatarioEmailPadrao ?? '')
  const [destinatarioNome, setDestinatarioNome] = useState(destinatarioNomePadrao ?? '')
  const [enviando, setEnviando] = useState(false)
  const [status, setStatus] = useState<'idle' | 'ok' | 'erro'>('idle')
  const [erroMsg, setErroMsg] = useState('')
  const [remetente, setRemetente] = useState('')

  async function handleEnviar() {
    if (!destinatarioEmail) {
      setErroMsg('Informe o e-mail do destinatário.')
      setStatus('erro')
      return
    }
    setEnviando(true)
    setStatus('idle')
    setErroMsg('')

    try {
      const res = await fetch('/api/enviar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotacao_id: cotacaoId,
          destinatario_email: destinatarioEmail,
          destinatario_nome: destinatarioNome,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErroMsg(data.error ?? 'Erro ao enviar e-mail.')
        setStatus('erro')
      } else {
        setRemetente(data.remetente)
        setStatus('ok')
      }
    } catch {
      setErroMsg('Erro de conexão. Tente novamente.')
      setStatus('erro')
    }
    setEnviando(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Enviar cotação por e-mail</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          {status === 'ok' ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">E-mail enviado com sucesso!</p>
              <p className="text-xs text-gray-500">
                Enviado de <span className="font-medium">{remetente}</span> para <span className="font-medium">{destinatarioEmail}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">O PDF do QAR foi anexado automaticamente.</p>
              <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800">
                Fechar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Nome do destinatário</label>
                <input
                  value={destinatarioNome}
                  onChange={e => setDestinatarioNome(e.target.value)}
                  placeholder="Nome da transportadora ou contato"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">E-mail do destinatário <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={destinatarioEmail}
                  onChange={e => setDestinatarioEmail(e.target.value)}
                  placeholder="email@transportadora.com.br"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Preview do que será enviado */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-2">O e-mail vai conter:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    Template com dados da cotação (empresa, CNPJ, ramo, importância segurada)
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    PDF do QAR completo em anexo
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    Enviado pelo e-mail configurado (seu perfil ou e-mail da corretora)
                  </div>
                </div>
              </div>

              {status === 'erro' && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-red-600 dark:text-red-400">{erroMsg}</p>
                    {erroMsg.includes('configuração') && (
                      <a href="/configuracoes" className="text-xs text-red-600 dark:text-red-400 underline mt-1 inline-block">
                        Ir para Configurações →
                      </a>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleEnviar}
                disabled={enviando || !destinatarioEmail}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {enviando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  : <><Send className="w-4 h-4" /> Enviar e-mail com PDF</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
