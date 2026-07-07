'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [verificando, setVerificando] = useState(true)
  const [email, setEmail] = useState('')

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }
      const { data } = await supabase.from('super_admins').select('id').eq('usuario_id', user.id).single()
      if (!data) { router.replace('/cotacoes'); return }
      setEmail(user.email ?? '')
      setVerificando(false)
    }
    verificar()
  }, [])

  if (verificando) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#8b949e' }}>Verificando acesso...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  const navItems = [
    { href: '/admin', label: 'Visão geral', icon: 'ti-layout-dashboard', exact: true },
    { href: '/admin/corretoras', label: 'Corretoras', icon: 'ti-building', exact: false },
    { href: '/admin/planos', label: 'Planos', icon: 'ti-crown', exact: false },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Sidebar admin — roxa escura */}
      <aside style={{ width: 220, background: '#13111a', borderRight: '1px solid #2d2438', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo QARtech admin */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #2d2438' }}>
          <div style={{ marginBottom: 3 }}>
            <span style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', fontSize: 20, fontWeight: 700, color: '#ffffff', letterSpacing: -.5 }}>QAR</span>
            <span style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', fontSize: 20, fontWeight: 300, color: '#a78bfa', letterSpacing: -.5 }}>tech</span>
          </div>
          <div style={{ position: 'relative', marginBottom: 5 }}>
            <div style={{ height: 1.5, background: 'rgba(255,255,255,0.08)', borderRadius: 1 }} />
            <div style={{ height: 1.5, background: '#7c3aed', borderRadius: 1, width: 30, position: 'absolute', top: 0, left: 0 }} />
          </div>
          <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            super admin · {email}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.7px', padding: '8px 8px 4px' }}>Gestão</div>
          {navItems.map(({ href, label, icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px',
                  borderRadius: 6, margin: '1px 0', textDecoration: 'none',
                  color: active ? '#fff' : 'rgba(255,255,255,.55)',
                  background: active ? '#7c3aed' : 'transparent',
                  fontSize: 13, fontWeight: active ? 500 : 400,
                }}>
                <i className={`ti ${icon}`} style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Rodapé */}
        <div style={{ padding: '10px 10px 14px', borderTop: '1px solid #2d2438' }}>
          <Link href="/cotacoes"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, textDecoration: 'none', color: 'rgba(255,255,255,.4)', fontSize: 12, marginBottom: 4 }}>
            <i className="ti ti-chevron-left" style={{ fontSize: 14 }} aria-hidden="true" />
            Voltar ao sistema
          </Link>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', fontSize: 12 }}>
            <i className="ti ti-logout" style={{ fontSize: 14 }} aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <main style={{ flex: 1, overflow: 'auto', background: '#0d1117' }}>
        {children}
      </main>
    </div>
  )
}
