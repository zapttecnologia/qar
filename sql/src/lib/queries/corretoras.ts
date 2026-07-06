import { createClient } from '@/lib/supabase/client'
import type { PapelMembro } from '@/types/database'

const supabase = createClient()

// Retorna todas as corretoras que o usuário logado tem acesso
export async function listarMinhasCorretoras() {
  const { data, error } = await supabase
    .from('membros')
    .select(`
      papel, convite_aceito,
      corretora:corretoras(id, nome, cnpj, plano_assinatura, logo_url)
    `)
    .eq('convite_aceito', true)

  if (error) throw error
  return data
}

// Membros de uma corretora (para tela de equipe)
export async function listarMembros(corretora_id: string) {
  const { data, error } = await supabase
    .from('membros')
    .select(`
      id, papel, convite_aceito, criado_em,
      usuario:usuarios(id, nome, email, avatar_url),
      time:times(id, nome)
    `)
    .eq('corretora_id', corretora_id)
    .order('criado_em')

  if (error) throw error
  return data
}

// Times de uma corretora
export async function listarTimes(corretora_id: string) {
  const { data, error } = await supabase
    .from('times')
    .select('*')
    .eq('corretora_id', corretora_id)
    .order('nome')

  if (error) throw error
  return data
}

// Atualiza papel de um membro (só admin pode)
export async function atualizarPapelMembro(membro_id: string, papel: PapelMembro) {
  const { data, error } = await supabase
    .from('membros')
    .update({ papel } as never)
    .eq('id', membro_id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Papel do usuário logado numa corretora
export async function meuPapelNaCorretora(corretora_id: string): Promise<PapelMembro | null> {
  const { data } = await supabase
    .from('membros')
    .select('papel')
    .eq('corretora_id', corretora_id)
    .eq('convite_aceito', true)
    .single()

  return (data as { papel?: PapelMembro } | null)?.papel ?? null
}
