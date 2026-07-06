import { createClient } from '@/lib/supabase/client'
import type { Cliente } from '@/types/cliente'

const supabase = createClient()

// Lista todos os clientes ativos da corretora
export async function listarClientes(corretora_id: string) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('corretora_id', corretora_id)
    .eq('ativo', true)
    .order('razao_social')

  if (error) throw error
  return data as Cliente[]
}

// Busca um cliente pelo CNPJ dentro da corretora
export async function buscarClientePorCNPJ(corretora_id: string, cnpj: string) {
  const digits = cnpj.replace(/\D/g, '')
  const formatted = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')

  const { data } = await supabase
    .from('clientes')
    .select('*')
    .eq('corretora_id', corretora_id)
    .eq('cnpj', formatted)
    .single()

  return data as Cliente | null
}

// Cria novo cliente
export async function criarCliente(payload: {
  corretora_id: string
  cnpj: string
  razao_social: string
  nome_fantasia?: string
  atividade_principal?: string
  endereco?: string
  cep?: string
  cidade_uf?: string
  site?: string
  antt?: string
  observacoes?: string
  contato_nome?: string
  contato_email?: string
  contato_telefone?: string
}) {
  const { data, error } = await supabase
    .from('clientes')
    .insert(payload as never)
    .select()
    .single()

  if (error) throw error
  return data as Cliente
}

// Atualiza cliente existente
export async function atualizarCliente(id: string, payload: Partial<Cliente>) {
  const { data, error } = await supabase
    .from('clientes')
    .update(payload as never)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Cliente
}

// Arquiva cliente (soft delete)
export async function arquivarCliente(id: string) {
  return atualizarCliente(id, { ativo: false })
}

// Conta cotações vinculadas a um cliente
export async function contarCotacoesDoCliente(cliente_id: string) {
  const { count } = await supabase
    .from('cotacoes')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', cliente_id)

  return count ?? 0
}
