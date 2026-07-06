-- ▶ QUERY 1 — Tabelas e RLS
-- Cole e rode, mande o resultado
select
  t.table_name,
  case when c.relrowsecurity then '✓ RLS ativo' else '✗ SEM RLS' end as rls
from information_schema.tables t
join pg_class c on c.relname = t.table_name
join pg_namespace n on n.oid = c.relnamespace
where t.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
  and n.nspname = 'public'
order by t.table_name;

-- ▶ QUERY 2 — Policies por tabela
-- Cole e rode, mande o resultado
select
  tablename,
  count(*) as total_policies,
  string_agg(policyname, ', ' order by policyname) as policies
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;

-- ▶ QUERY 3 — Funções
-- Cole e rode, mande o resultado
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'auth_corretora_ids','auth_papel_em','auth_time_em',
    'pode_ver_cotacao','set_atualizado_em','handle_novo_usuario',
    'registrar_mudanca_status','registrar_criacao_cotacao'
  )
order by routine_name;

-- ▶ QUERY 4 — Triggers
-- Cole e rode, mande o resultado
select
  trigger_name,
  event_object_schema as schema,
  event_object_table as tabela,
  event_manipulation as evento
from information_schema.triggers
where trigger_name in (
  'trg_corretoras_atualizado_em',
  'trg_cotacoes_atualizado_em',
  'trg_novo_usuario',
  'trg_cotacao_status_historico',
  'trg_cotacao_criacao_historico'
)
order by trigger_name;
