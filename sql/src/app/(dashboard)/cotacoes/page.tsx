'use client'

import { useQuery } from '@tanstack/react-query'
import { Plus, FileText } from 'lucide-react'
import Link from 'next/link'
import { useSessao } from '@/hooks/useSessao'
import { listarCotacoes, buscarMetricasCotacoes } from '@/lib/queries/cotacoes'
import { statusConfig, formatBRL } from '@/lib/utils'
import { usePode } from '@/hooks/useSessao'

export default function CotacoesPage() {
  const { corretora } = useSessao()
  const pode = usePode('criar')

  const { data: metricas } = useQuery({
    queryKey: ['metricas', corretora?.id],
    queryFn: () => buscarMetricasCotacoes(corretora!.id),
    enabled: !!corretora?.id,
  })

  const { data: cotacoes, isLoading } = useQuery({
    queryKey: ['cotacoes', corretora?.id],
    queryFn: () => listarCotacoes(corretora!.id),
    enabled: !!corretora?.id,
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Cotações</h1>
        {pode && (
          <Link
            href="/cotacoes/nova"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova cotação
          </Link>
        )}
      </div>

      {/* Métricas */}
      {metricas && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Em aberto', value: metricas.em_aberto },
            { label: 'Enviadas', value: metricas.enviadas_mes },
            { label: 'Taxa de conversão', value: `${metricas.taxa_conversao}%` },
          ].map(m => (
            <div key={m.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500 mb-1">{m.label}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista de cotações */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando cotações...</div>
        ) : cotacoes?.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhuma cotação ainda.</p>
            {pode && (
              <Link href="/cotacoes/nova" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                Criar primeira cotação
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Empresa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ramo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Criado por</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {(cotacoes as Array<Record<string, string>>)?.map(c => {
                const status = statusConfig[c.status as keyof typeof statusConfig]
                const atualizadoEm = new Date(c.atualizado_em).toLocaleDateString('pt-BR')
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => window.location.href = `/cotacoes/${c.id}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{c.razao_social ?? c.cnpj}</p>
                      {c.nome_fantasia && <p className="text-xs text-gray-400">{c.nome_fantasia}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.ramo}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${status?.className}`}>
                        {status?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {(c.criado_por_usuario as { nome?: string } | null)?.nome ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{atualizadoEm}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
