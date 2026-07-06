-- ============================================================
-- FUNÇÕES AUXILIARES
-- Usadas dentro das políticas de RLS para evitar repetição
-- e para permitir que o Postgres faça cache do plano de execução.
-- ============================================================

-- Retorna todas as corretoras que o usuário logado pertence
create or replace function auth_corretora_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select corretora_id
  from membros
  where usuario_id = auth.uid()
    and convite_aceito = true
$$;

comment on function auth_corretora_ids is 'Lista de corretora_id que o usuário autenticado pode acessar.';

-- Retorna o papel do usuário logado numa corretora específica
create or replace function auth_papel_em(p_corretora_id uuid)
returns papel_membro
language sql
security definer
stable
as $$
  select papel
  from membros
  where usuario_id = auth.uid()
    and corretora_id = p_corretora_id
    and convite_aceito = true
  limit 1
$$;

comment on function auth_papel_em is 'Papel (admin/aprovador/corretor/visualizador) do usuário autenticado numa corretora.';

-- Retorna o time_id do usuário logado numa corretora específica
create or replace function auth_time_em(p_corretora_id uuid)
returns uuid
language sql
security definer
stable
as $$
  select time_id
  from membros
  where usuario_id = auth.uid()
    and corretora_id = p_corretora_id
    and convite_aceito = true
  limit 1
$$;

comment on function auth_time_em is 'Time do usuário autenticado dentro de uma corretora.';

-- Verifica se o usuário logado pode ver uma cotação específica,
-- respeitando papel (admin/aprovador veem tudo) e visibilidade do time
create or replace function pode_ver_cotacao(
  p_corretora_id uuid,
  p_time_id uuid
)
returns boolean
language sql
security definer
stable
as $$
  select
    case auth_papel_em(p_corretora_id)
      when 'admin' then true
      when 'aprovador' then true
      else (
        p_time_id is null
        or p_time_id = auth_time_em(p_corretora_id)
        or exists (
          select 1 from times
          where id = p_time_id
            and visivel_para_corretora = true
        )
      )
    end
$$;

comment on function pode_ver_cotacao is 'Regra central de visibilidade: admin/aprovador veem tudo; demais papéis veem seu próprio time ou times marcados como compartilhados.';

-- Mantém atualizado_em sempre corrente
create or replace function set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;
