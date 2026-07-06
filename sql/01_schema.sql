-- ============================================================
-- ESQUEMA DE BANCO DE DADOS
-- Sistema SaaS de cotações de seguro de transporte
-- Multi-tenant: corretoras isoladas, times com visibilidade configurável
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type papel_membro as enum ('admin', 'aprovador', 'corretor', 'visualizador');

create type status_cotacao as enum ('rascunho', 'em_analise', 'pendente_dados', 'aprovada', 'enviada', 'arquivada');

create type ramo_seguro as enum ('RCTR-C', 'RC-DC', 'RCTA-C', 'RCT-OM', 'RCTR-VI', 'RCA-C');

-- ============================================================
-- TABELA: corretoras
-- A raiz do multi-tenancy. Toda tabela de dados aponta para uma corretora.
-- ============================================================

create table corretoras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text unique,
  plano_assinatura text not null default 'trial' check (plano_assinatura in ('trial', 'basico', 'profissional', 'enterprise')),
  status_assinatura text not null default 'ativa' check (status_assinatura in ('ativa', 'inadimplente', 'cancelada')),
  logo_url text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table corretoras is 'Cada cliente do SaaS (corretora de seguros) é uma linha aqui. Raiz do isolamento multi-tenant.';

-- ============================================================
-- TABELA: usuarios
-- Espelha auth.users do Supabase. Uma pessoa pode pertencer a várias corretoras.
-- ============================================================

create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nome text not null,
  avatar_url text,
  criado_em timestamptz not null default now()
);

comment on table usuarios is 'Perfil público do usuário. O id é o mesmo do auth.users do Supabase Auth.';

-- ============================================================
-- TABELA: times
-- Agrupamento interno dentro de uma corretora. Controla visibilidade de cotações.
-- ============================================================

create table times (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references corretoras(id) on delete cascade,
  nome text not null,
  visivel_para_corretora boolean not null default false,
  criado_em timestamptz not null default now()
);

comment on column times.visivel_para_corretora is 'Se true, qualquer membro da corretora vê as cotações deste time. Se false, só quem pertence ao time (mais admin/aprovador).';

create index idx_times_corretora on times(corretora_id);

-- ============================================================
-- TABELA: membros
-- Vínculo entre um usuário e uma corretora, com papel e time opcional.
-- ============================================================

create table membros (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  corretora_id uuid not null references corretoras(id) on delete cascade,
  time_id uuid references times(id) on delete set null,
  papel papel_membro not null default 'corretor',
  convite_aceito boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (usuario_id, corretora_id)
);

comment on table membros is 'Um usuário pode ter uma linha de membro por corretora (não por time). O papel é por corretora.';

create index idx_membros_usuario on membros(usuario_id);
create index idx_membros_corretora on membros(corretora_id);
create index idx_membros_time on membros(time_id);

-- ============================================================
-- TABELA: cotacoes
-- O formulário QAR estruturado. Campos principais das páginas 1-3 do PDF original.
-- ============================================================

create table cotacoes (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references corretoras(id) on delete cascade,
  time_id uuid references times(id) on delete set null,
  criado_por uuid not null references usuarios(id),

  -- Dados cadastrais (preenchidos via busca de CNPJ)
  cnpj text not null,
  razao_social text,
  nome_fantasia text,
  atividade_principal text,
  endereco text,
  cep text,
  cidade_uf text,
  site text,
  antt text,
  contato_nome text,
  contato_email text,
  contato_telefone text,

  -- Ramo e cobertura
  ramo ramo_seguro not null,
  tipo_embarcador text check (tipo_embarcador in ('exportacao', 'importacao', 'tn', null)),

  -- Tipos de transporte (percentuais, soma <= 100)
  pct_terrestre numeric(5,2) not null default 0 check (pct_terrestre between 0 and 100),
  pct_aereo numeric(5,2) not null default 0 check (pct_aereo between 0 and 100),
  pct_aquaviario numeric(5,2) not null default 0 check (pct_aquaviario between 0 and 100),
  pct_ferroviario numeric(5,2) not null default 0 check (pct_ferroviario between 0 and 100),

  -- Operação mensal
  qtd_embarques_mes integer check (qtd_embarques_mes >= 0),
  valor_medio_embarque numeric(14,2),
  valor_maximo_embarque numeric(14,2),
  importancia_segurada numeric(14,2),
  obs_sazonalidade text,

  -- Motoristas (percentuais, soma <= 100)
  pct_frota numeric(5,2) default 0 check (pct_frota between 0 and 100),
  pct_transportadoras numeric(5,2) default 0 check (pct_transportadoras between 0 and 100),
  pct_agregado numeric(5,2) default 0 check (pct_agregado between 0 and 100),
  pct_autonomo numeric(5,2) default 0 check (pct_autonomo between 0 and 100),

  -- Detalhes livres
  detalhes_operacao text,
  condicoes_particulares text,

  status status_cotacao not null default 'rascunho',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- Validações de soma de percentuais (nunca passa de 100%)
  constraint chk_soma_transporte check (pct_terrestre + pct_aereo + pct_aquaviario + pct_ferroviario <= 100),
  constraint chk_soma_motoristas check (pct_frota + pct_transportadoras + pct_agregado + pct_autonomo <= 100)
);

comment on table cotacoes is 'Cotação de seguro de transporte. Campos espelham o formulário QAR original.';

create index idx_cotacoes_corretora on cotacoes(corretora_id);
create index idx_cotacoes_time on cotacoes(time_id);
create index idx_cotacoes_criado_por on cotacoes(criado_por);
create index idx_cotacoes_status on cotacoes(status);
create index idx_cotacoes_cnpj on cotacoes(cnpj);

-- ============================================================
-- TABELA: cotacao_mercadorias
-- Linha de tabela dinâmica do formulário (tipo de mercadoria x % embarcador)
-- ============================================================

create table cotacao_mercadorias (
  id uuid primary key default gen_random_uuid(),
  cotacao_id uuid not null references cotacoes(id) on delete cascade,
  tipo text not null,
  embarcador text,
  percentual numeric(5,2) check (percentual between 0 and 100)
);

create index idx_merc_cotacao on cotacao_mercadorias(cotacao_id);

-- ============================================================
-- TABELA: cotacao_percursos
-- Linha de tabela dinâmica (origem/destino x %)
-- ============================================================

create table cotacao_percursos (
  id uuid primary key default gen_random_uuid(),
  cotacao_id uuid not null references cotacoes(id) on delete cascade,
  origem text not null,
  destino text not null,
  percentual numeric(5,2) check (percentual between 0 and 100)
);

create index idx_percursos_cotacao on cotacao_percursos(cotacao_id);

-- ============================================================
-- TABELA: cotacao_sinistros
-- Histórico de sinistros declarados na cotação
-- ============================================================

create table cotacao_sinistros (
  id uuid primary key default gen_random_uuid(),
  cotacao_id uuid not null references cotacoes(id) on delete cascade,
  data_sinistro date,
  ramo text,
  local_origem text,
  local_destino text,
  valor_prejuizo numeric(14,2),
  detalhes text
);

create index idx_sinistros_cotacao on cotacao_sinistros(cotacao_id);

-- ============================================================
-- TABELA: cotacao_gerenciamento_risco
-- Gerenciadora de risco, rastreador e condições pretendidas
-- ============================================================

create table cotacao_gerenciamento_risco (
  id uuid primary key default gen_random_uuid(),
  cotacao_id uuid not null references cotacoes(id) on delete cascade,
  gerenciadora text,
  possui_cadastro boolean default false,
  possui_vitimologia boolean default false,
  possui_monitoramento boolean default false,
  rastreador_fornecedor text,
  rastreador_tipo text check (rastreador_tipo in ('gsm_gprs', 'hibrido', 'rf_fixo_isca', null)),
  detalhes text
);

create index idx_gerenc_cotacao on cotacao_gerenciamento_risco(cotacao_id);

-- ============================================================
-- TABELA: historico_cotacao
-- Timeline de eventos de uma cotação (auditoria)
-- ============================================================

create table historico_cotacao (
  id uuid primary key default gen_random_uuid(),
  cotacao_id uuid not null references cotacoes(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  evento text not null,
  detalhes jsonb,
  criado_em timestamptz not null default now()
);

comment on table historico_cotacao is 'Registra cada mudança relevante: criação, preenchimento automático de CNPJ, mudança de status, edições.';

create index idx_historico_cotacao on historico_cotacao(cotacao_id);
create index idx_historico_criado_em on historico_cotacao(criado_em desc);
