'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSessao, SessaoProvider } from '@/hooks/useSessao'
import { useCotacoes } from '@/hooks/useCotacoes'
import { ReactQueryProvider } from '@/components/layout/ReactQueryProvider'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard',    label: 'Início',          icon: 'ti-home' },
  { href: '/cotacoes',     label: 'Cotações',        icon: 'ti-file-text' },
  { href: '/clientes',     label: 'Clientes',        icon: 'ti-building' },
  { href: '/equipe',       label: 'Equipe',           icon: 'ti-users' },
  { href: '/configuracoes', label: 'Configurações',  icon: 'ti-settings' },
]

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { usuario, corretora, corretoras, trocarCorretora, sair, carregando, isSuperAdmin } = useSessao()
  const cota = useCotacoes()
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
      {/* Logo QARtech — Variação 4 */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--sidebar-border)' }}>
        <div style={{ marginBottom: 3 }}>
          <span style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', fontSize: 22, fontWeight: 700, color: '#ffffff', letterSpacing: -.5 }}>QAR</span>
          <span style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', fontSize: 22, fontWeight: 300, color: '#58a5f0', letterSpacing: -.5 }}>tech</span>
        </div>
        <div style={{ position: 'relative', marginBottom: 5 }}>
          <div style={{ height: 1.5, background: 'rgba(255,255,255,0.1)', borderRadius: 1 }} />
          <div style={{ height: 1.5, background: '#58a5f0', borderRadius: 1, width: 34, position: 'absolute', top: 0, left: 0 }} />
        </div>
        <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {corretora?.nome ?? 'sistema de cotações'}
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
            {corretoras.map(({ corretora: c }, idx) => (
              <option key={`${c.id}-${idx}`} value={c.id} style={{ background: '#1a3a5c', color: '#fff' }}>{c.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* Nav principal */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--sidebar-section)', textTransform: 'uppercase', letterSpacing: '.7px', padding: '8px 8px 4px' }}>Principal</div>
        {NAV.slice(0, 3).map(({ href, label, icon }) => {
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
        {NAV.slice(3).map(({ href, label, icon }) => {
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

      {/* Widget de uso de cotações */}
      {!cota.carregando && cota.limite && (
        <div style={{ margin: '0 10px 8px', padding: '10px 12px', background: 'rgba(255,255,255,.05)', borderRadius: 8, border: cota.alerta || !cota.pode ? '1px solid rgba(248,81,73,.3)' : '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 600 }}>Cotações</span>
            <span style={{ fontSize: 11, color: !cota.pode ? '#f85149' : cota.alerta ? '#f59e0b' : 'rgba(255,255,255,.4)' }}>
              {cota.usadas}/{cota.limite}
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2, marginBottom: 5 }}>
            <div style={{ height: 4, borderRadius: 2, transition: 'width .3s',
              background: !cota.pode ? '#f85149' : cota.alerta ? '#f59e0b' : '#3fb950',
              width: `${Math.min((cota.usadas / cota.limite) * 100, 100)}%` }} />
          </div>
          <p style={{ fontSize: 10, color: !cota.pode ? '#f85149' : cota.alerta ? '#f59e0b' : 'rgba(255,255,255,.3)', margin: 0 }}>
            {!cota.pode ? 'Limite atingido — faça upgrade' : cota.alerta ? `${cota.restantes} restantes este mês` : `${cota.restantes} disponíveis`}
          </p>
        </div>
      )}

      {/* Rodapé */}
      <div style={{ padding: '10px 10px 14px', borderTop: '1px solid var(--sidebar-border)' }}>
        <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, textDecoration: 'none', color: 'rgba(167,139,250,.7)', fontSize: 12, marginBottom: 2 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,.1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          <i className="ti ti-shield" style={{ fontSize: 14 }} aria-hidden="true" />
          Painel admin
        </Link>
        <Link href="/perfil" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 6, textDecoration: 'none', cursor: 'pointer', marginBottom: 2 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{iniciais}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nome ?? '—'}</div>
            <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 10 }}>Meu perfil</div>
          </div>
          <i className="ti ti-chevron-right" style={{ color: 'rgba(255,255,255,.2)', fontSize: 13, flexShrink: 0 }} aria-hidden="true" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 6, cursor: 'pointer' }}
          onClick={() => sair().then(() => router.push('/auth/login'))}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          <i className="ti ti-logout" style={{ color: 'rgba(255,255,255,.35)', fontSize: 15, flexShrink: 0 }} aria-hidden="true" />
          <span style={{ color: 'rgba(255,255,255,.35)', fontSize: 12 }}>Sair</span>
        </div>
      </div>
    </aside>
  )

  // Títulos das páginas
  const PAGE_TITLES: Record<string, string> = {
    '/dashboard': 'Início', '/cotacoes': 'Cotações', '/clientes': 'Clientes',
    '/equipe': 'Equipe', '/configuracoes': 'Configurações',
  }
  const pageTitle = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? 'Cargotech'

  // Super admin sem corretora → redireciona para /admin
  useEffect(() => {
    if (!carregando && isSuperAdmin && !corretora && corretoras.length === 0) {
      router.replace('/admin')
    }
  }, [carregando, isSuperAdmin, corretora, corretoras])

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
