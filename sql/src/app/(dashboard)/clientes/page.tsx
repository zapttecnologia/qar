'use client'

export const dynamic = 'force-dynamic'

import { useQuery } from '@tanstack/react-query'
import { Plus, Building2, Search, Phone, Mail } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useSessao, usePode } from '@/hooks/useSessao'
import { listarClientes } from '@/lib/queries/clientes'

export default function ClientesPage() {
  const { corretora } = useSessao()
  const pode = usePode('criar')
  const [busca, setBusca] = useState('')

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes', corretora?.id],
    queryFn: () => listarClientes(corretora!.id),
    enabled: !!corretora?.id,
  })

  const filtrados = clientes?.filter(c =>
    c.razao_social.toLowerCase().includes(busca.toLowerCase()) ||
    c.cnpj.includes(busca) ||
    c.nome_fantasia?.toLowerCase().includes(busca.toLowerCase())
  ) ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Transportadoras cadastradas</p>
        </div>
        {pode && (
          <Link
            href="/clientes/novo"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo cliente
          </Link>
        )}
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome, nome fantasia ou CNPJ..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando clientes...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {busca ? 'Nenhum cliente encontrado para essa busca.' : 'Nenhum cliente cadastrado ainda.'}
            </p>
            {pode && !busca && (
              <Link href="/clientes/novo" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                Cadastrar primeiro cliente
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtrados.map(cliente => (
              <Link
                key={cliente.id}
                href={`/clientes/${cliente.id}`}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                    {(cliente.nome_fantasia ?? cliente.razao_social).substring(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Dados principais */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {cliente.razao_social}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {cliente.nome_fantasia && `${cliente.nome_fantasia} · `}{cliente.cnpj}
                  </p>
                </div>

                {/* Cidade */}
                {cliente.cidade_uf && (
                  <span className="text-xs text-gray-400 hidden sm:block flex-shrink-0">
                    {cliente.cidade_uf}
                  </span>
                )}

                {/* Contato */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {cliente.contato_email && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="hidden md:block truncate max-w-32">{cliente.contato_email}</span>
                    </div>
                  )}
                  {cliente.contato_telefone && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="hidden md:block">{cliente.contato_telefone}</span>
                    </div>
                  )}
                </div>

                {/* ANTT */}
                {cliente.antt && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-md flex-shrink-0">
                    ANTT {cliente.antt}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {clientes && clientes.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-right">
          {filtrados.length} de {clientes.length} clientes
        </p>
      )}
    </div>
  )
}
