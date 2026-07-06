'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario, Corretora, PapelMembro } from '@/types/database'

interface SessaoContexto {
  usuario: Usuario | null
  corretora: Corretora | null
  papel: PapelMembro | null
  corretoras: Array<{ corretora: Corretora; papel: PapelMembro }>
  trocarCorretora: (id: string) => void
  carregando: boolean
  sair: () => Promise<void>
}

const SessaoContexto = createContext<SessaoContexto>({
  usuario: null,
  corretora: null,
  papel: null,
  corretoras: [],
  trocarCorretora: () => {},
  carregando: true,
  sair: async () => {},
})

export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [corretoras, setCorretoras] = useState<Array<{ corretora: Corretora; papel: PapelMembro }>>([])
  const [corretoraAtiva, setCorretoraAtiva] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  const carregarSessao = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCarregando(false); return }

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()

      setUsuario(perfil)

      const { data: membros, error } = await supabase
        .from('membros')
        .select(`
          papel,
          convite_aceito,
          corretora:corretoras(id, nome, cnpj, plano_assinatura, logo_url)
        `)
        .eq('convite_aceito', true)

      console.log('[sessao] membros:', membros, 'erro:', error)

      const lista = (membros ?? [])
        .filter((m: Record<string, unknown>) => m['corretora'])
        .map((m: Record<string, unknown>) => ({
          corretora: m['corretora'] as Corretora,
          papel: m['papel'] as PapelMembro,
        }))

      setCorretoras(lista)

      // Restaura corretora salva ou usa a primeira — e salva no localStorage
      const salva = localStorage.getItem('corretora_ativa')
      const valida = lista.find(c => c.corretora.id === salva)
      const corretoraId = valida?.corretora.id ?? lista[0]?.corretora.id ?? null

      console.log('[sessao] corretora ativa:', corretoraId)

      if (corretoraId) {
        localStorage.setItem('corretora_ativa', corretoraId)
      }
      setCorretoraAtiva(corretoraId)

    } catch (err) {
      console.error('[sessao] erro:', err)
    } finally {
      setCarregando(false)
    }
  }, [supabase])

  useEffect(() => {
    carregarSessao()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') carregarSessao()
      if (event === 'SIGNED_OUT') {
        setUsuario(null)
        setCorretoras([])
        setCorretoraAtiva(null)
        localStorage.removeItem('corretora_ativa')
      }
    })

    return () => subscription.unsubscribe()
  }, [carregarSessao, supabase])

  const trocarCorretora = useCallback((id: string) => {
    setCorretoraAtiva(id)
    localStorage.setItem('corretora_ativa', id)
  }, [])

  const sair = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase])

  const corretoraInfo = corretoras.find(c => c.corretora.id === corretoraAtiva)

  return (
    <SessaoContexto.Provider value={{
      usuario,
      corretora: corretoraInfo?.corretora ?? null,
      papel: corretoraInfo?.papel ?? null,
      corretoras,
      trocarCorretora,
      carregando,
      sair,
    }}>
      {children}
    </SessaoContexto.Provider>
  )
}

export const useSessao = () => useContext(SessaoContexto)

export function usePode(acao: 'criar' | 'editar' | 'excluir' | 'gerenciar_equipe') {
  const { papel } = useSessao()
  if (!papel) return false

  const permissoes: Record<typeof acao, PapelMembro[]> = {
    criar:            ['admin', 'aprovador', 'corretor'],
    editar:           ['admin', 'aprovador', 'corretor'],
    excluir:          ['admin', 'aprovador'],
    gerenciar_equipe: ['admin'],
  }

  return permissoes[acao].includes(papel)
}
