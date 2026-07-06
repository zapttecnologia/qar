-- ============================================================
-- DIAGNÓSTICO E CORREÇÃO
-- Cole tudo isso de uma vez no SQL Editor do Supabase
-- ============================================================

-- 1. Remove trigger e função anteriores se existirem
drop trigger if exists trg_novo_usuario on auth.users;
drop function if exists public.handle_novo_usuario();

-- 2. Recria a função com search_path explícito
--    (necessário para funções que acessam auth.users no Supabase)
create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, email, nome)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing; -- evita erro se usuário já existir
  return new;
end;
$$;

-- 3. Recria o trigger
create trigger trg_novo_usuario
  after insert on auth.users
  for each row execute function public.handle_novo_usuario();

-- 4. Confirma que foi criado
select trigger_name, event_manipulation, event_object_table
from information_schema.triggers
where trigger_name = 'trg_novo_usuario';
