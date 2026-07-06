'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Users, Settings, LogOut, ChevronDown, Building2, Shield } from 'lucide-react'
import { useSessao, SessaoProvider } from '@/hooks/useSessao'
import { ReactQueryProvider } from '@/components/layout/ReactQueryProvider'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navItems = [
  { href: '/cotacoes', label: 'Cotações', icon: FileText },
  { href: '/clientes', label: 'Clientes', icon: Building2 },
  { href: '/equipe', label: 'Equipe', icon: Users },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

function Sidebar() {
  const pathname = usePathname()
  const { usuario, corretora, corretoras, trocarCorretora, sair } = useSessao()
  const [seletorAberto, setSeletorAberto] = useState(false)

  return (
    <aside className="w-56 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="relative p-3 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setSeletorAberto(v => !v)}
          className="flex items-center gap-2 w-full p-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-7 h-7 rounded-md bg-blue-900 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
              {corretora?.nome ?? 'Selecione...'}
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        </button>
        {seletorAberto && corretoras.length > 1 && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
            {corretoras.map(({ corretora: c, papel }) => (
              <button
                key={c.id}
                onClick={() => { trocarCorretora(c.id); setSeletorAberto(false) }}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800',
                  c.id === corretora?.id && 'bg-gray-50 dark:bg-gray-800 font-medium'
                )}
              >
                <span className="flex-1 truncate text-gray-900 dark:text-gray-100">{c.nome}</span>
                <span className="text-xs text-gray-400 capitalize">{papel}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname.startsWith(href)
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              {usuario?.nome?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{usuario?.nome}</p>
            <p className="text-xs text-gray-400 truncate">{usuario?.email}</p>
          </div>
        </div>
        <button
          onClick={() => sair()}
          className="flex items-center gap-2 w-full px-3 py-2 mt-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
        <a href="/admin"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 transition-colors">
          <Shield className="w-3.5 h-3.5" />
          Painel Admin
        </a>
      </div>
    </aside>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <SessaoProvider>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </SessaoProvider>
    </ReactQueryProvider>
  )
}
