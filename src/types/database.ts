// Tipos gerados manualmente do schema SQL que montamos.
// Quando o projeto amadurecer, substitua por: npx supabase gen types typescript --local

export type PapelMembro = 'admin' | 'aprovador' | 'corretor' | 'visualizador'
export type StatusCotacao = 'rascunho' | 'em_analise' | 'pendente_dados' | 'aprovada' | 'enviada' | 'arquivada'
export type RamoSeguro = 'RCTR-C' | 'RC-DC' | 'RC-V' | 'RCTA-C' | 'RCT-OM' | 'RCTR-VI' | 'RCA-C'

export interface Corretora {
  id: string
  nome: string
  cnpj: string | null
  plano_assinatura: 'trial' | 'basico' | 'profissional' | 'enterprise'
  status_assinatura: 'ativa' | 'inadimplente' | 'cancelada'
  logo_url: string | null
  criado_em: string
  atualizado_em: string
}

export interface Usuario {
  id: string
  email: string
  nome: string
  avatar_url: string | null
  criado_em: string
}

export interface Time {
  id: string
  corretora_id: string
  nome: string
  visivel_para_corretora: boolean
  criado_em: string
}

export interface Membro {
  id: string
  usuario_id: string
  corretora_id: string
  time_id: string | null
  papel: PapelMembro
  convite_aceito: boolean
  criado_em: string
  // joins opcionais
  usuario?: Usuario
  time?: Time
}

export interface Cotacao {
  id: string
  corretora_id: string
  time_id: string | null
  criado_por: string
  // Dados cadastrais
  cnpj: string
  razao_social: string | null
  nome_fantasia: string | null
  atividade_principal: string | null
  endereco: string | null
  cep: string | null
  cidade_uf: string | null
  site: string | null
  antt: string | null
  contato_nome: string | null
  contato_email: string | null
  contato_telefone: string | null
  // Cobertura
  ramo: RamoSeguro
  tipo_embarcador: 'exportacao' | 'importacao' | 'tn' | null
  // Percentuais de transporte
  pct_terrestre: number
  pct_aereo: number
  pct_aquaviario: number
  pct_ferroviario: number
  // Operação
  qtd_embarques_mes: number | null
  valor_medio_embarque: number | null
  valor_maximo_embarque: number | null
  importancia_segurada: number | null
  obs_sazonalidade: string | null
  // Motoristas
  pct_frota: number
  pct_transportadoras: number
  pct_agregado: number
  pct_autonomo: number
  // Outros
  detalhes_operacao: string | null
  condicoes_particulares: string | null
  status: StatusCotacao
  criado_em: string
  atualizado_em: string
  // joins opcionais
  criado_por_usuario?: Usuario
  time?: Time
}

export interface CotacaoMercadoria {
  id: string
  cotacao_id: string
  tipo: string
  embarcador: string | null
  percentual: number | null
}

export interface CotacaoPercurso {
  id: string
  cotacao_id: string
  origem: string
  destino: string
  percentual: number | null
}

export interface CotacaoSinistro {
  id: string
  cotacao_id: string
  data_sinistro: string | null
  ramo: string | null
  local_origem: string | null
  local_destino: string | null
  valor_prejuizo: number | null
  detalhes: string | null
}

export interface HistoricoCotacao {
  id: string
  cotacao_id: string
  usuario_id: string | null
  evento: string
  detalhes: Record<string, unknown> | null
  criado_em: string
  usuario?: Usuario
}

// Tipo de retorno da API de CNPJ (BrasilAPI)
export interface DadosCNPJ {
  cnpj: string
  razao_social: string
  nome_fantasia: string | null
  cnae_fiscal: number
  cnae_fiscal_descricao: string
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  municipio: string
  uf: string
  cep: string
}

// Database types para o cliente Supabase (tipagem genérica)
export type Database = {
  public: {
    Tables: {
      corretoras: { Row: Corretora; Insert: Partial<Corretora>; Update: Partial<Corretora> }
      usuarios: { Row: Usuario; Insert: Partial<Usuario>; Update: Partial<Usuario> }
      times: { Row: Time; Insert: Partial<Time>; Update: Partial<Time> }
      membros: { Row: Membro; Insert: Partial<Membro>; Update: Partial<Membro> }
      cotacoes: { Row: Cotacao; Insert: Partial<Cotacao>; Update: Partial<Cotacao> }
      cotacao_mercadorias: { Row: CotacaoMercadoria; Insert: Partial<CotacaoMercadoria>; Update: Partial<CotacaoMercadoria> }
      cotacao_percursos: { Row: CotacaoPercurso; Insert: Partial<CotacaoPercurso>; Update: Partial<CotacaoPercurso> }
      cotacao_sinistros: { Row: CotacaoSinistro; Insert: Partial<CotacaoSinistro>; Update: Partial<CotacaoSinistro> }
      historico_cotacao: { Row: HistoricoCotacao; Insert: Partial<HistoricoCotacao>; Update: Partial<HistoricoCotacao> }
    }
  }
}
