'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('E-mail ou senha incorretos.')
      setCarregando(false)
      return
    }
    // Verifica se é super admin — redireciona para /admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: sa } = await supabase.from('super_admins').select('id').eq('usuario_id', currentUser?.id ?? '').single()
    if (sa) {
      window.location.href = '/admin'
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f2744', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo QARtech — Variação 4 */}
        <div style={{ textAlign: 'left', marginBottom: 36 }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', fontSize: 42, fontWeight: 700, color: '#ffffff', letterSpacing: -1 }}>QAR</span>
            <span style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', fontSize: 42, fontWeight: 300, color: '#58a5f0', letterSpacing: -1 }}>tech</span>
          </div>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <div style={{ height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 1 }} />
            <div style={{ height: 2, background: '#58a5f0', borderRadius: 1, width: 66, position: 'absolute', top: 0, left: 0 }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>sistema de cotações</p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20 }}>Entrar na conta</h2>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="field-label">E-mail corporativo</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Senha</label>
              <input
                type="password" required value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                className="field-input"
              />
            </div>

            {erro && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '9px 12px', fontSize: 12, color: '#dc2626' }}>
                {erro}
              </div>
            )}

            <button type="submit" disabled={carregando} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', marginTop: 4 }}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: 11, marginTop: 20 }}>
          © {new Date().getFullYear()} Cargotech · Todos os direitos reservados
        </p>
      </div>

      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
    </div>
  )
}
