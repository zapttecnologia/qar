'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, AlertTriangle } from 'lucide-react'

interface Corretora {
  id: string
  nome: string
  cnpj: string | null
  plano_assinatura: string
  plano_valor: number | null
  plano_vencimento: string | null
  status_assinatura: string
  bloqueada: boolean
  total_cotacoes: number
  total_membros: number
  cotacoes_mes_atual: number
  criado_em: string
}

const PLANO_COR: Record<string, string> = {
  trial:        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  basico:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  profissional: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  enterprise:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export default function AdminCorretorasPage() {
  const router = useRouter()
  const supabase = createClient()
  const [corretoras, setCorretoras] = useState<Corretora[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    supabase.from('vw_metricas_corretoras').select('*').order('criado_em', { ascending: false })
      .then(({ data }) => { setCorretoras((data ?? []) as Corretora[]); setCarregando(false) })
  }, [])

  const filtradas = corretoras.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.cnpj ?? '').includes(busca)
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Corretoras</h1>
          <p className="text-sm text-gray-500 mt-0.5">{corretoras.length} corretoras cadastradas</p>
        </div>
        <button
          onClick={() => router.push('/admin/corretoras/nova')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500"
        >
          <Plus className="w-4 h-4" /> Nova corretora
        </button>
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou CNPJ..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {carregando ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Corretora','CNPJ','Plano','Valor/mês','Membros','Cotações','Status',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtradas.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => router.push(`/admin/corretoras/${c.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {c.bloqueada && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                      <span className="font-medium text-gray-900 dark:text-white">{c.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.cnpj ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium capitalize ${PLANO_COR[c.plano_assinatura] ?? PLANO_COR.trial}`}>
                      {c.plano_assinatura}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                    {c.plano_valor ? `R$ ${Number(c.plano_valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.total_membros ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.total_cotacoes ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                      c.bloqueada ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : c.status_assinatura === 'ativa' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : c.status_assinatura === 'inadimplente' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {c.bloqueada ? 'Bloqueada' : c.status_assinatura}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-blue-600">Ver →</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
