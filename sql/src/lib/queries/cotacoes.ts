import { createClient } from '@/lib/supabase/client'
import type { Cotacao, StatusCotacao } from '@/types/database'

const supabase = createClient()

// Lista cotações visíveis para o usuário logado (RLS filtra automaticamente)
export async function listarCotacoes(corretora_id: string) {
  const { data, error } = await supabase
    .from('cotacoes')
    .select(`
      id, cnpj, razao_social, nome_fantasia, ramo, status,
      criado_em, atualizado_em,
      criado_por_usuario:usuarios!criado_por(nome),
      time:times(nome)
    `)
    .eq('corretora_id', corretora_id)
    .order('atualizado_em', { ascending: false })

  if (error) throw error
  return data
}

// Detalhe completo de uma cotação com todas as tabelas filhas
export async function buscarCotacao(id: string) {
  const { data, error } = await supabase
    .from('cotacoes')
    .select(`
      *,
      criado_por_usuario:usuarios!criado_por(id, nome, email),
      time:times(id, nome),
      cotacao_mercadorias(*),
      cotacao_percursos(*),
      cotacao_sinistros(*),
      cotacao_gerenciamento_risco(*),
      historico_cotacao(
        id, evento, detalhes, criado_em,
        usuario:usuarios(nome)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Cria nova cotação (rascunho inicial com só o obrigatório)
export async function criarCotacao(payload: {
  corretora_id: string
  cnpj: string
  ramo: Cotacao['ramo']
  razao_social?: string
  nome_fantasia?: string
  atividade_principal?: string
  endereco?: string
  cep?: string
  cidade_uf?: string
  site?: string
  antt?: string
  contato_nome?: string
  contato_email?: string
  contato_telefone?: string
  pct_terrestre?: number
  pct_aereo?: number
  pct_aquaviario?: number
  pct_ferroviario?: number
  qtd_embarques_mes?: number
  valor_medio_embarque?: number
  valor_maximo_embarque?: number
  importancia_segurada?: number
  obs_sazonalidade?: string
  detalhes_operacao?: string
  pct_frota?: number
  pct_transportadoras?: number
  pct_agregado?: number
  pct_autonomo?: number
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('cotacoes')
    .insert({
      ...payload,
      criado_por: user.id,
      status: 'rascunho',
      pct_terrestre: payload.ramo === 'RCTR-C' ? 100 : 0,
      pct_aereo: 0,
      pct_aquaviario: 0,
      pct_ferroviario: 0,
    } as never)
    .select()
    .single()

  if (error) throw error
  return data
}

// Atualiza campos de uma cotação existente
export async function atualizarCotacao(id: string, payload: Partial<Cotacao>) {
  const { data, error } = await supabase
    .from('cotacoes')
    .update(payload as never)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Muda apenas o status
export async function atualizarStatusCotacao(id: string, status: StatusCotacao) {
  return atualizarCotacao(id, { status })
}

// Salva mercadorias (substitui tudo — mais simples que diff)
export async function salvarMercadorias(
  cotacao_id: string,
  mercadorias: Array<{ tipo: string; embarcador?: string; percentual?: number }>
) {
  await supabase.from('cotacao_mercadorias').delete().eq('cotacao_id', cotacao_id)

  if (mercadorias.length === 0) return []

  const { data, error } = await supabase
    .from('cotacao_mercadorias')
    .insert(mercadorias.map(m => ({ ...m, cotacao_id })) as never)
    .select()

  if (error) throw error
  return data
}

// Salva percursos (substitui tudo)
export async function salvarPercursos(
  cotacao_id: string,
  percursos: Array<{ origem: string; destino: string; percentual?: number }>
) {
  await supabase.from('cotacao_percursos').delete().eq('cotacao_id', cotacao_id)

  if (percursos.length === 0) return []

  const { data, error } = await supabase
    .from('cotacao_percursos')
    .insert(percursos.map(p => ({ ...p, cotacao_id })) as never)
    .select()

  if (error) throw error
  return data
}

// Métricas do painel
export async function buscarMetricasCotacoes(corretora_id: string) {
  const { data, error } = await supabase
    .from('cotacoes')
    .select('status')
    .eq('corretora_id', corretora_id)

  if (error) throw error

  const rows = data as Array<{ status: string }>
  const total = rows.length
  const em_aberto = rows.filter(c => ['rascunho', 'em_analise', 'pendente_dados'].includes(c.status)).length
  const enviadas_mes = rows.filter(c => c.status === 'enviada').length
  const aprovadas = rows.filter(c => c.status === 'aprovada').length
  const taxa_conversao = total > 0 ? Math.round((aprovadas / total) * 100) : 0

  return { total, em_aberto, enviadas_mes, aprovadas, taxa_conversao }
}
