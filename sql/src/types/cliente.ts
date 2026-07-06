// Adicione ao src/types/database.ts

export interface Cliente {
  id: string
  corretora_id: string
  cnpj: string
  razao_social: string
  nome_fantasia: string | null
  atividade_principal: string | null
  endereco: string | null
  cep: string | null
  cidade_uf: string | null
  site: string | null
  antt: string | null
  situacao_rntrc: string | null
  observacoes: string | null
  contato_nome: string | null
  contato_email: string | null
  contato_telefone: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}
