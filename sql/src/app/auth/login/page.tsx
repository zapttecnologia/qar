'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [modo, setModo] = useState<'senha' | 'magic'>('senha')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setInfo('')
    setCarregando(true)

    if (modo === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) setErro(error.message)
      else setInfo('Verifique seu e-mail — enviamos um link de acesso.')
      setCarregando(false)
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    console.log('[login] resultado:', data, error)

    if (error) {
      setErro('E-mail ou senha incorretos.')
      setCarregando(false)
      return
    }

    // Redireciona forçando reload completo para o middleware pegar a sessão
    window.location.href = '/cotacoes'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-900 mb-4">
            <span className="text-white font-bold text-sm">CT</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Cargotech</h1>
          <p className="text-sm text-gray-500 mt-1">Cotações de seguro de transporte</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-base font-medium text-gray-900 dark:text-white mb-5">Entrar na conta</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
                E-mail corporativo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {modo === 'senha' && (
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {erro && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                {erro}
              </p>
            )}
            {info && (
              <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {carregando ? 'Aguarde...' : modo === 'senha' ? 'Entrar' : 'Enviar link de acesso'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setModo(m => m === 'senha' ? 'magic' : 'senha'); setErro(''); setInfo('') }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {modo === 'senha' ? 'Prefiro entrar sem senha (magic link)' : 'Prefiro usar senha'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
