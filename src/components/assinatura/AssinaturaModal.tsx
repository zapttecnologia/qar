'use client'

import { useState } from 'react'
import { X, PenLine, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

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

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  pendente:  { label: 'Aguardando assinatura', cor: 'text-amber-600 bg-amber-50 border-amber-200' },
  assinado:  { label: 'Assinado', cor: 'text-green-600 bg-green-50 border-green-200' },
  recusado:  { label: 'Recusado', cor: 'text-red-600 bg-red-50 border-red-200' },
  expirado:  { label: 'Expirado', cor: 'text-gray-500 bg-gray-50 border-gray-200' },
}

export function AssinaturaModal({
  cotacaoId, razaoSocial, contatoNome, contatoEmail,
  assinaturaStatus, assinaturaLink, onClose, onEnviado
}: Props) {
  const [email, setEmail] = useState(contatoEmail ?? '')
  const [nome, setNome] = useState(contatoNome ?? '')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [link, setLink] = useState(assinaturaLink ?? '')
  const [enviado, setEnviado] = useState(!!assinaturaStatus && assinaturaStatus !== 'expirado')

  async function handleEnviar() {
    if (!email) { setErro('Informe o e-mail do signatário.'); return }
    setErro('')
    setEnviando(true)

    try {
      const res = await fetch('/api/assinatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotacao_id: cotacaoId,
          signatario_email: email,
          signatario_nome: nome,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.error ?? 'Erro ao enviar para assinatura.')
      } else {
        setLink(data.link)
        setEnviado(true)
        onEnviado()
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    }
    setEnviando(false)
  }

  const statusAtual = assinaturaStatus ?? (enviado ? 'pendente' : null)
  const statusInfo = statusAtual ? STATUS_LABEL[statusAtual] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Assinatura Eletrônica</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Status atual se já enviado */}
          {statusInfo && (
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium ${statusInfo.cor}`}>
              {statusAtual === 'assinado'
                ? <CheckCircle className="w-4 h-4" />
                : <PenLine className="w-4 h-4" />}
              {statusInfo.label}
            </div>
          )}

          {/* Link de acompanhamento */}
          {link && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">Link do documento:</p>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline break-all"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                {link}
              </a>
            </div>
          )}

          {/* Formulário de envio */}
          {!enviado && (
            <>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                <p className="text-xs text-purple-700 dark:text-purple-400 font-medium mb-1">Como funciona:</p>
                <ol className="space-y-1">
                  {[
                    'O PDF do QAR é enviado automaticamente para a plataforma de assinatura configurada',
                    'O signatário recebe um e-mail com o link para assinar digitalmente',
                    'Após a assinatura, o status é atualizado no sistema',
                  ].map((t, i) => (
                    <li key={i} className="flex gap-2 text-xs text-purple-600 dark:text-purple-400">
                      <span className="flex-shrink-0 font-medium">{i + 1}.</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Nome do signatário</label>
                <input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  E-mail do signatário <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErro('') }}
                  placeholder="email@empresa.com.br"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {erro && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>
                    {erro.includes('configurado') && (
                      <a href="/configuracoes" className="text-xs text-red-600 underline mt-1 inline-block">
                        Ir para Configurações →
                      </a>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleEnviar}
                disabled={enviando || !email}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 disabled:opacity-50 transition-colors"
              >
                {enviando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  : <><PenLine className="w-4 h-4" /> Enviar para assinatura</>}
              </button>
            </>
          )}

          {/* Reenviar se já estava enviado */}
          {enviado && statusAtual !== 'assinado' && (
            <button
              onClick={() => { setEnviado(false); setLink('') }}
              className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Reenviar para outro signatário
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
