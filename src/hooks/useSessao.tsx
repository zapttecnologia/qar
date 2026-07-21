'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Usuario { id: string; nome: string; email: string }
interface Corretora { id: string; nome: string; nome_exibicao?: string; logo_url?: string; cor_primaria?: string; cor_secundaria?: string }
interface MembroCorretora { corretora: Corretora; papel: string }

interface SessaoCtx {
  usuario: Usuario | null
  corretora: Corretora | null
  corretoras: MembroCorretora[]
  papel: string | null
  isSuperAdmin: boolean
  carregando: boolean
  trocarCorretora: (id: string) => void
  sair: () => Promise<void>
}

const Ctx = createContext<SessaoCtx>({
  usuario: null, corretora: null, corretoras: [], papel: null,
  isSuperAdmin: false, carregando: true,
  trocarCorretora: () => {}, sair: async () => {},
})

export function SessaoProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [corretoras, setCorretoras] = useState<MembroCorretora[]>([])
  const [corretora, setCorretora] = useState<Corretora | null>(null)
  const [papel, setPapel] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarSessao()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/auth/login')
      if (event === 'SIGNED_IN') carregarSessao()
    })
    return () => subscription.unsubscribe()
  }, [])

  async function carregarSessao() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCarregando(false); return }

    // Busca perfil do usuário
    const { data: perfil } = await supabase
      .from('usuarios').select('id, nome, email').eq('id', user.id).single()

    const u: Usuario = {
      id: user.id,
      nome: (perfil as Record<string, string> | null)?.nome ?? user.user_metadata?.nome ?? user.email?.split('@')[0] ?? 'Usuário',
      email: user.email ?? '',
    }
    setUsuario(u)

    // Verifica se é super admin
    const { data: sa } = await supabase
      .from('super_admins').select('id').eq('usuario_id', user.id).maybeSingle()
    setIsSuperAdmin(!!sa)

    // Busca corretoras vinculadas
    const { data: membros } = await supabase
      .from('membros')
      .select('papel, corretora:corretoras(id, nome, nome_exibicao, logo_url, cor_primaria, cor_secundaria)')
      .eq('usuario_id', user.id)
      .eq('convite_aceito', true)

    const lista = (membros ?? []).map((m: Record<string, unknown>) => ({
      corretora: (m.corretora as unknown as Corretora),
      papel: m.papel as string,
    })).filter((m: { corretora: Corretora | null }) => m.corretora)

    setCorretoras(lista)

    // Define corretora ativa
    // Super admin sem corretora → não precisa de corretora
    if (lista.length > 0) {
      const salva = localStorage.getItem(`corretora_id_${user.id}`)
      const encontrada = salva ? lista.find(m => m.corretora.id === salva) : null
      const ativa = encontrada ?? lista[0]
      setCorretora(ativa.corretora)
      setPapel(ativa.papel)
    } else if (sa) {
      // Super admin puro — sem corretora vinculada, tudo bem
      setCorretora(null)
      setPapel('super_admin')
    }

    setCarregando(false)
  }

  function trocarCorretora(id: string) {
    const encontrada = corretoras.find(m => m.corretora.id === id)
    if (!encontrada) return
    setCorretora(encontrada.corretora)
    setPapel(encontrada.papel)
    if (usuario) localStorage.setItem(`corretora_id_${usuario.id}`, id)
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider value={{ usuario, corretora, corretoras, papel, isSuperAdmin, carregando, trocarCorretora, sair }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSessao() { return useContext(Ctx) }

export function usePode(acao: string): boolean {
  const { papel, isSuperAdmin } = useContext(Ctx)
  if (isSuperAdmin) return true
  if (papel === 'admin') return true
  if (papel === 'aprovador' && ['criar', 'editar', 'aprovar'].includes(acao)) return true
  if (papel === 'corretor' && ['criar', 'editar'].includes(acao)) return true
  return false
}
