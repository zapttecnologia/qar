'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Archive, FileText, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useSessao, usePode } from '@/hooks/useSessao'
import { atualizarCliente, arquivarCliente, contarCotacoesDoCliente } from '@/lib/queries/clientes'
import { listarCotacoes } from '@/lib/queries/cotacoes'
import { ClienteForm, type ClienteFormData } from '@/components/clientes/ClienteForm'
import { statusConfig } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Cliente } from '@/types/cliente'

export default function ClienteDetalhePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { corretora } = useSessao()
  const pode = usePode('editar')
  const podeDeletar = usePode('excluir')
  const queryClient = useQueryClient()
  const supabase = createClient()

  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes').select('*').eq('id', id).single()
      if (error) throw error
      return data as Cliente
    },
    enabled: !!id,
  })

  const { data: totalCotacoes } = useQuery({
    queryKey: ['cliente-cotacoes-count', id],
    queryFn: () => contarCotacoesDoCliente(id),
    enabled: !!id,
  })

  const { data: cotacoes } = useQuery({
    queryKey: ['cotacoes', corretora?.id],
    queryFn: () => listarCotacoes(corretora!.id),
    enabled: !!corretora?.id,
    select: data => (data as Record<string, string>[]).filter(c => c.cliente_id === id).slice(0, 5),
  })

  async function handleSalvar(data: ClienteFormData) {
    setSalvando(true)
    try {
      await atualizarCliente(id, data)
      await queryClient.invalidateQueries({ queryKey: ['cliente', id] })
      await queryClient.invalidateQueries({ queryKey: ['clientes', corretora?.id] })
      setEditando(false)
    } catch {
      alert('Erro ao salvar. Tente novamente.')
    }
    setSalvando(false)
  }

  async function handleArquivar() {
    if (!confirm(`Arquivar "${cliente?.razao_social}"? Ela não aparecerá mais na lista.`)) return
    await arquivarCliente(id)
    await queryClient.invalidateQueries({ queryKey: ['clientes', corretora?.id] })
    router.push('/clientes')
  }

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Carregando...</div>
  if (!cliente) return <div className="p-6 text-sm text-gray-400">Cliente não encontrado.</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{cliente.razao_social}</h1>
            <p className="text-sm text-gray-500">{cliente.cnpj} {cliente.cidade_uf && `· ${cliente.cidade_uf}`}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {pode && !editando && (
            <button
              onClick={() => setEditando(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
          )}
          {podeDeletar && !editando && (
            <button
              onClick={handleArquivar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Archive className="w-3.5 h-3.5" /> Arquivar
            </button>
          )}
        </div>
      </div>

      {editando ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Editando dados</h2>
            <button onClick={() => setEditando(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
          </div>
          <ClienteForm
            defaultValues={cliente as unknown as Record<string, unknown>}
            onSubmit={handleSalvar}
            salvando={salvando}
            submitLabel="Salvar alterações"
          />
        </div>
      ) : (
        <>
          {/* Cards de dados */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800 mb-4">
            {[
              ['Razão social', cliente.razao_social],
              ['Nome fantasia', cliente.nome_fantasia],
              ['CNPJ', cliente.cnpj],
              ['Atividade principal', cliente.atividade_principal],
              ['Endereço', cliente.endereco],
              ['CEP', cliente.cep],
              ['Cidade / UF', cliente.cidade_uf],
              ['Site', cliente.site],
              ['ANTT', cliente.antt],
              ['Contato', cliente.contato_nome],
              ['E-mail', cliente.contato_email],
              ['Telefone', cliente.contato_telefone],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-900 dark:text-white text-right max-w-xs">{v}</span>
              </div>
            ))}
            {cliente.observacoes && (
              <div className="px-4 py-3 text-sm">
                <p className="text-gray-500 mb-1">Observações</p>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">{cliente.observacoes}</p>
              </div>
            )}
          </div>

          {/* Cotações vinculadas */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cotações ({totalCotacoes ?? 0})
                </span>
              </div>
              <Link
                href={`/cotacoes/nova?cliente_id=${id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                + Nova cotação
              </Link>
            </div>
            {cotacoes && cotacoes.length > 0 ? (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {cotacoes.map((c) => {
                  const status = statusConfig[c.status as keyof typeof statusConfig]
                  return (
                    <Link
                      key={c.id}
                      href={`/cotacoes/${c.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{c.ramo}</p>
                        <p className="text-xs text-gray-400">{new Date(c.criado_em).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${status?.className}`}>
                        {status?.label}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300" />
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhuma cotação vinculada ainda.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
