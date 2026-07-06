'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSessao, SessaoProvider } from '@/hooks/useSessao'
import { ReactQueryProvider } from '@/components/layout/ReactQueryProvider'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/cotacoes', label: 'Cotações',      icon: 'ti-file-text' },
  { href: '/clientes', label: 'Clientes',       icon: 'ti-building' },
  { href: '/equipe',   label: 'Equipe',          icon: 'ti-users' },
  { href: '/configuracoes', label: 'Configurações', icon: 'ti-settings' },
]

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { usuario, corretora, corretoras, trocarCorretora, sair, carregando } = useSessao()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (saved) { setTheme(saved); document.documentElement.setAttribute('data-theme', saved) }
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark'); document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const iniciais = usuario?.nome?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? '?'

  const Sidebar = () => (
    <aside style={{
      width: 'var(--sidebar-width)', background: 'var(--sidebar-bg)',
      display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ti ti-truck" style={{ color: '#fff', fontSize: 15 }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>Cargotech</div>
          <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 10, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {corretora?.nome ?? 'Selecione...'}
          </div>
        </div>
      </div>

      {/* Seletor de corretora (se tiver mais de uma) */}
      {corretoras.length > 1 && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--sidebar-border)' }}>
          <select
            value={corretora?.id ?? ''}
            onChange={e => trocarCorretora(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 5, color: 'rgba(255,255,255,.8)', fontSize: 12, padding: '5px 8px', outline: 'none', cursor: 'pointer' }}
          >
            {corretoras.map(({ corretora: c }) => (
              <option key={c.id} value={c.id} style={{ background: '#1a3a5c', color: '#fff' }}>{c.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* Nav principal */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--sidebar-section)', textTransform: 'uppercase', letterSpacing: '.7px', padding: '8px 8px 4px' }}>Principal</div>
        {NAV.slice(0, 2).map(({ href, label, icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px',
                borderRadius: 6, margin: '1px 0', textDecoration: 'none',
                color: active ? '#fff' : 'var(--sidebar-text)',
                background: active ? 'var(--sidebar-active)' : 'transparent',
                fontSize: 13, fontWeight: active ? 500 : 400,
                transition: 'background .1s, color .1s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <i className={`ti ${icon}`} style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
              {label}
            </Link>
          )
        })}

        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--sidebar-section)', textTransform: 'uppercase', letterSpacing: '.7px', padding: '14px 8px 4px' }}>Gestão</div>
        {NAV.slice(2).map(({ href, label, icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px',
                borderRadius: 6, margin: '1px 0', textDecoration: 'none',
                color: active ? '#fff' : 'var(--sidebar-text)',
                background: active ? 'var(--sidebar-active)' : 'transparent',
                fontSize: 13, fontWeight: active ? 500 : 400,
                transition: 'background .1s, color .1s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <i className={`ti ${icon}`} style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé */}
      <div style={{ padding: '10px 10px 14px', borderTop: '1px solid var(--sidebar-border)' }}>
        <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, textDecoration: 'none', color: 'rgba(167,139,250,.7)', fontSize: 12, marginBottom: 4 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,.1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          <i className="ti ti-shield" style={{ fontSize: 14 }} aria-hidden="true" />
          Painel admin
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 6, cursor: 'pointer' }}
          onClick={() => sair().then(() => router.push('/auth/login'))}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{iniciais}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nome ?? '—'}</div>
            <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 10 }}>Sair</div>
          </div>
          <i className="ti ti-logout" style={{ color: 'rgba(255,255,255,.3)', fontSize: 14, flexShrink: 0 }} aria-hidden="true" />
        </div>
      </div>
    </aside>
  )

  // Títulos das páginas
  const PAGE_TITLES: Record<string, string> = {
    '/cotacoes': 'Cotações', '/clientes': 'Clientes',
    '/equipe': 'Equipe', '/configuracoes': 'Configurações',
  }
  const pageTitle = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? 'Cargotech'

  if (carregando) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Carregando...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar desktop */}
      <div className="hide-mobile" style={{ width: 'var(--sidebar-width)', flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* Sidebar mobile (overlay) */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: 'relative', width: 'var(--sidebar-width)', zIndex: 1 }}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Área principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          height: 'var(--topbar-h)', background: 'var(--topbar-bg)',
          borderBottom: '1px solid var(--topbar-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Hamburguer mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4 }}
              className="show-mobile"
              aria-label="Abrir menu"
            >
              <i className="ti ti-menu-2" style={{ fontSize: 20 }} aria-hidden="true" />
            </button>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.2 }}>{pageTitle}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{corretora?.nome ?? ''}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Toggle tema */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
              style={{
                width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border-color)',
                background: 'var(--bg-card)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)',
                transition: 'background .15s',
              }}
            >
              <i className={`ti ${theme === 'light' ? 'ti-moon' : 'ti-sun'}`} style={{ fontSize: 15 }} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Conteúdo */}
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-page)' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <SessaoProvider>
        <DashboardInner>{children}</DashboardInner>
      </SessaoProvider>
    </ReactQueryProvider>
  )
}
