import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Retorna null durante SSR (sem variáveis de ambiente no build)
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Durante build estático, retorna um proxy vazio para não quebrar
    if (typeof window === 'undefined') return null as never
    throw new Error('Supabase URL e API key são obrigatórios')
  }

  return createBrowserClient<Database>(url, key)
}
