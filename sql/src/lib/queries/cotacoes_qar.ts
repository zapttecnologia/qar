// Queries para as tabelas relacionadas do QAR completo
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

type TabelaFilha =
  | 'cotacao_experiencia_anterior'
  | 'cotacao_condicao_atual'
  | 'cotacao_ddrs'
  | 'cotacao_gerenciadoras'
  | 'cotacao_condicoes_pretendidas'
  | 'cotacao_sinistros'
  | 'cotacao_mercadorias'
  | 'cotacao_percursos'

// Salva/substitui linhas de qualquer tabela filha
export async function salvarTabelaFilha(
  tabela: TabelaFilha,
  cotacao_id: string,
  linhas: Record<string, unknown>[]
) {
  // Deleta tudo e reinsere (mais simples que diff para tabelas pequenas)
  await supabase.from(tabela).delete().eq('cotacao_id', cotacao_id)
  if (linhas.length === 0) return []

  const { data, error } = await supabase
    .from(tabela)
    .insert(linhas.map(l => ({ ...l, cotacao_id })) as never)
    .select()

  if (error) throw error
  return data
}

// Busca todas as tabelas filhas de uma cotação
export async function buscarTabelasFilhas(cotacao_id: string) {
  const [
    experiencia,
    condicaoAtual,
    ddrs,
    gerenciadoras,
    condPretendidas,
    sinistros,
    mercadorias,
    percursos,
  ] = await Promise.all([
    supabase.from('cotacao_experiencia_anterior').select('*').eq('cotacao_id', cotacao_id),
    supabase.from('cotacao_condicao_atual').select('*').eq('cotacao_id', cotacao_id),
    supabase.from('cotacao_ddrs').select('*').eq('cotacao_id', cotacao_id),
    supabase.from('cotacao_gerenciadoras').select('*').eq('cotacao_id', cotacao_id),
    supabase.from('cotacao_condicoes_pretendidas').select('*').eq('cotacao_id', cotacao_id),
    supabase.from('cotacao_sinistros').select('*').eq('cotacao_id', cotacao_id),
    supabase.from('cotacao_mercadorias').select('*').eq('cotacao_id', cotacao_id),
    supabase.from('cotacao_percursos').select('*').eq('cotacao_id', cotacao_id),
  ])

  return {
    experiencia: experiencia.data ?? [],
    condicaoAtual: condicaoAtual.data ?? [],
    ddrs: ddrs.data ?? [],
    gerenciadoras: gerenciadoras.data ?? [],
    condPretendidas: condPretendidas.data ?? [],
    sinistros: sinistros.data ?? [],
    mercadorias: mercadorias.data ?? [],
    percursos: percursos.data ?? [],
  }
}
