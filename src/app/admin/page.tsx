'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, FileText, Users, TrendingUp, AlertTriangle } from 'lucide-react'

interface Metricas {
  total_corretoras: number
  corretoras_ativas: number
  corretoras_trial: number
  corretoras_bloqueadas: number
  total_cotacoes: number
  cotacoes_mes: number
  total_usuarios: number
}

interface CorretoraRecente {
  id: string
  nome: string
  plano_assinatura: string
  status_assinatura: string
  bloqueada: boolean
  total_cotacoes: number
  cotacoes_mes_atual: number
  criado_em: string
  ultima_cotacao_em: string | null
}

export default function AdminPage() {
  const supabase = createClient()
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [corretoras, setCorretoras] = useState<CorretoraRecente[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: view } = await supabase
        .from('vw_metricas_corretoras')
        .select('*')
        .order('criado_em', { ascending: false })

      const lista = (view ?? []) as CorretoraRecente[]
      setCorretoras(lista.slice(0, 8))

      setMetricas({
        total_corretoras: lista.length,
        corretoras_ativas: lista.filter(c => c.status_assinatura === 'ativa' && !c.bloqueada).length,
        corretoras_trial: lista.filter(c => c.plano_assinatura === 'trial').length,
        corretoras_bloqueadas: lista.filter(c => c.bloqueada).length,
        total_cotacoes: lista.reduce((s, c) => s + (c.total_cotacoes ?? 0), 0),
        cotacoes_mes: lista.reduce((s, c) => s + (c.cotacoes_mes_atual ?? 0), 0),
        total_usuarios: 0,
      })
      setCarregando(false)
    }
    carregar()
  }, [])

  const PLANO_COR: Record<string, string> = {
    trial: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    basico: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    profissional: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Visão geral</h1>
        <p className="text-sm text-gray-500 mt-0.5">Painel de gestão global do sistema</p>
      </div>

      {/* Métricas */}
      {carregando ? (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : metricas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Corretoras ativas', value: metricas.corretoras_ativas, icon: Building2, cor: 'text-blue-600' },
            { label: 'Em trial', value: metricas.corretoras_trial, icon: TrendingUp, cor: 'text-amber-500' },
            { label: 'Total de cotações', value: metricas.total_cotacoes, icon: FileText, cor: 'text-green-600' },
            { label: 'Cotações este mês', value: metricas.cotacoes_mes, icon: TrendingUp, cor: 'text-purple-600' },
          ].map(m => (
            <div key={m.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className={`w-4 h-4 ${m.cor}`} />
                <p className="text-xs text-gray-500">{m.label}</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alertas */}
      {metricas && metricas.corretoras_bloqueadas > 0 && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">
            {metricas.corretoras_bloqueadas} corretora{metricas.corretoras_bloqueadas > 1 ? 's' : ''} bloqueada{metricas.corretoras_bloqueadas > 1 ? 's' : ''}.
            <a href="/admin/corretoras" className="underline ml-1">Ver detalhes</a>
          </p>
        </div>
      )}

      {/* Lista de corretoras */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Corretoras recentes</h2>
          <a href="/admin/corretoras" className="text-xs text-blue-600 hover:underline">Ver todas →</a>
        </div>

        {carregando ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Corretora', 'Plano', 'Cotações', 'Este mês', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {corretoras.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.bloqueada && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                      <span className="font-medium text-gray-900 dark:text-white">{c.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium capitalize ${PLANO_COR[c.plano_assinatura] ?? PLANO_COR.trial}`}>
                      {c.plano_assinatura}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.total_cotacoes ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.cotacoes_mes_atual ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                      c.bloqueada ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : c.status_assinatura === 'ativa' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {c.bloqueada ? 'Bloqueada' : c.status_assinatura}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/admin/corretoras/${c.id}`} className="text-xs text-blue-600 hover:underline">Ver</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
