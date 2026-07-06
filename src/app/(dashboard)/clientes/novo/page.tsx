'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useSessao } from '@/hooks/useSessao'
import { criarCliente } from '@/lib/queries/clientes'
import { ClienteForm, type ClienteFormData } from '@/components/clientes/ClienteForm'

export default function NovoClientePage() {
  const router = useRouter()
  const { corretora } = useSessao()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(data: ClienteFormData) {
    if (!corretora) return
    setSalvando(true)
    setErro('')
    try {
      const cliente = await criarCliente({ corretora_id: corretora.id, ...data })
      router.push(`/clientes/${cliente.id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('unique')) {
        setErro('Este CNPJ já está cadastrado para essa corretora.')
      } else {
        setErro('Erro ao salvar. Tente novamente.')
      }
      setSalvando(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Novo cliente</h1>
          <p className="text-sm text-gray-500">Cadastrar transportadora</p>
        </div>
      </div>

      {erro && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
          {erro}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <ClienteForm
          onSubmit={handleSubmit}
          salvando={salvando}
          submitLabel="Cadastrar cliente"
        />
      </div>
    </div>
  )
}
