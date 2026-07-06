-- ============================================================
-- DIAGNÓSTICO COMPLETO — cole no SQL Editor e rode
-- Vai verificar tabelas, RLS, policies, funções e triggers
-- ============================================================

-- 1. TABELAS criadas
select
  table_name,
  case when row_security = 'YES' then '✓ RLS ativo' else '✗ SEM RLS' end as rls
from information_schema.tables t
join pg_class c on c.relname = t.table_name
left join pg_namespace n on n.oid = c.relnamespace
left join (
  select relname, relrowsecurity
  from pg_class
) rc on rc.relname = t.table_name
cross join lateral (select rc.relrowsecurity::text = 'true' as row_security) rls
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;

-- 2. POLICIES de RLS por tabela
select
  tablename,
  count(*) as total_policies,
  string_agg(policyname, ', ' order by policyname) as policies
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;

-- 3. FUNÇÕES criadas
select
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'auth_corretora_ids',
    'auth_papel_em',
    'auth_time_em',
    'pode_ver_cotacao',
    'set_atualizado_em',
    'handle_novo_usuario',
    'registrar_mudanca_status',
    'registrar_criacao_cotacao'
  )
order by routine_name;

-- 4. TRIGGERS criados
select
  trigger_name,
  event_object_table as tabela,
  event_manipulation as evento,
  action_timing as momento
from information_schema.triggers
where trigger_schema = 'public'
   or event_object_schema = 'public'
order by event_object_table, trigger_name;

-- 5. ENUMS criados
select
  t.typname as enum_name,
  string_agg(e.enumlabel, ', ' order by e.enumsortorder) as valores
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
group by t.typname
order by t.typname;
