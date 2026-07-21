'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: 'ti-layout-dashboard', exact: true, children: [] },
  {
    href: '/admin/corretoras', label: 'Corretoras', icon: 'ti-building', exact: false,
    children: [
      { href: '/admin/corretoras', label: 'Todas as corretoras' },
      { href: '/admin/corretoras?status=ativa', label: 'Ativas' },
      { href: '/admin/corretoras?status=suspenso', label: 'Suspensas' },
      { href: '/admin/corretoras?status=bloqueada', label: 'Bloqueadas' },
      { href: '/admin/corretoras/nova', label: '+ Nova corretora', accent: true },
    ]
  },
  { href: '/admin/financeiro', label: 'Financeiro', icon: 'ti-cash', exact: false, children: [] },
  { href: '/admin/planos', label: 'Planos', icon: 'ti-crown', exact: false, children: [] },
  { href: '/admin/super-admins', label: 'Super Admins', icon: 'ti-shield', exact: false, children: [] },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [verificando, setVerificando] = useState(true)
  const [nomeAdmin, setNomeAdmin] = useState('')
  const [emailAdmin, setEmailAdmin] = useState('')
  const [expandidos, setExpandidos] = useState<string[]>(['/admin/corretoras'])

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('super_admins').select('id, nome').eq('usuario_id', user.id).eq('ativo', true).maybeSingle()
      if (!data) { router.replace('/auth/login'); return }
      setEmailAdmin(user.email ?? '')
      setNomeAdmin((data as Record<string,string>).nome || user.email?.split('@')[0] || 'Admin')
      setVerificando(false)
    }
    verificar()
  }, [])

  if (verificando) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117' }}>
      <div style={{ width: 30, height: 30, border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const iniciais = nomeAdmin.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase() || 'SA'

  function toggle(href: string) {
    setExpandidos(p => p.includes(href) ? p.filter(h => h !== href) : [...p, href])
  }

  const s = {
    sidebar: { width: 228, background: '#13111a', borderRight: '1px solid #1f1729', display: 'flex', flexDirection: 'column', flexShrink: 0 } as React.CSSProperties,
    navItem: (active: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 6, margin: '1px 0', cursor: 'pointer', fontSize: 13, fontWeight: active ? 500 : 400, color: active ? '#fff' : 'rgba(255,255,255,.5)', background: active ? '#7c3aed' : 'transparent', userSelect: 'none' as const }),
    subItem: (active: boolean, accent?: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 5, textDecoration: 'none', fontSize: 12, color: accent ? 'rgba(167,139,250,.7)' : active ? '#a78bfa' : 'rgba(255,255,255,.35)', background: active ? 'rgba(124,58,237,.12)' : 'transparent', borderLeft: active ? '2px solid #7c3aed' : '2px solid transparent' }),
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <aside style={s.sidebar}>
        {/* Logo */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #1f1729' }}>
          <div><span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: -.5 }}>QAR</span><span style={{ fontSize: 20, fontWeight: 300, color: '#a78bfa', letterSpacing: -.5 }}>tech</span></div>
          <div style={{ height: 1.5, background: 'linear-gradient(90deg,#7c3aed,transparent)', borderRadius: 1, margin: '4px 0' }} />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', letterSpacing: 2, textTransform: 'uppercase' }}>painel administrativo</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {NAV.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            const expanded = expandidos.includes(item.href)
            const hasChildren = item.children.length > 0

            return (
              <div key={item.href}>
                <div style={s.navItem(active && !hasChildren)}
                  onClick={() => hasChildren ? toggle(item.href) : router.push(item.href)}
                  onMouseEnter={e => { if (!(active && !hasChildren)) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.05)' }}
                  onMouseLeave={e => { if (!(active && !hasChildren)) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: 15, flexShrink: 0 }} aria-hidden="true" />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {hasChildren && <i className={`ti ${expanded ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ fontSize: 12, color: 'rgba(255,255,255,.25)' }} aria-hidden="true" />}
                </div>
                {hasChildren && expanded && (
                  <div style={{ marginLeft: 20, marginBottom: 4, borderLeft: '1px solid rgba(255,255,255,.06)', paddingLeft: 4 }}>
                    {item.children.map((child: { href: string; label: string; accent?: boolean }) => {
                      const ca = pathname + (typeof window !== 'undefined' ? window.location.search : '') === child.href
                        || (child.href === '/admin/corretoras' && pathname === '/admin/corretoras')
                      return (
                        <Link key={child.href} href={child.href} style={s.subItem(ca, child.accent)}>
                          <i className="ti ti-minus" style={{ fontSize: 8, opacity: .5 }} aria-hidden="true" />
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Rodapé */}
        <div style={{ padding: '10px 10px 14px', borderTop: '1px solid #1f1729' }}>
          <Link href="/cotacoes" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 6, textDecoration: 'none', color: 'rgba(255,255,255,.3)', fontSize: 12, marginBottom: 4 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 13 }} aria-hidden="true" /> Voltar ao sistema
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{iniciais}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#e6edf3', fontSize: 12, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeAdmin}</p>
              <p style={{ color: 'rgba(255,255,255,.28)', fontSize: 10, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emailAdmin}</p>
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.25)', padding: 2 }} title="Sair">
              <i className="ti ti-logout" style={{ fontSize: 14 }} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', background: '#0d1117' }}>{children}</main>
    </div>
  )
}
