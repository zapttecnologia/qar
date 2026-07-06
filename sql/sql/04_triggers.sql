-- ============================================================
-- TRIGGERS
-- ============================================================

-- Mantém atualizado_em corrente em corretoras e cotacoes
create trigger trg_corretoras_atualizado_em
before update on corretoras
for each row execute function set_atualizado_em();

create trigger trg_cotacoes_atualizado_em
before update on cotacoes
for each row execute function set_atualizado_em();

-- ============================================================
-- Cria automaticamente a linha em usuarios quando alguém
-- se cadastra via Supabase Auth (auth.users)
-- ============================================================

create or replace function handle_novo_usuario()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into usuarios (id, email, nome)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger trg_novo_usuario
after insert on auth.users
for each row execute function handle_novo_usuario();

-- ============================================================
-- Registra automaticamente no histórico quando o status
-- de uma cotação muda
-- ============================================================

create or replace function registrar_mudanca_status()
returns trigger
language plpgsql
security definer
as $$
begin
  if old.status is distinct from new.status then
    insert into historico_cotacao (cotacao_id, usuario_id, evento, detalhes)
    values (
      new.id,
      auth.uid(),
      'mudanca_status',
      jsonb_build_object('de', old.status, 'para', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger trg_cotacao_status_historico
after update on cotacoes
for each row execute function registrar_mudanca_status();

-- ============================================================
-- Registra automaticamente a criação da cotação no histórico
-- ============================================================

create or replace function registrar_criacao_cotacao()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into historico_cotacao (cotacao_id, usuario_id, evento)
  values (new.id, new.criado_por, 'cotacao_criada');
  return new;
end;
$$;

create trigger trg_cotacao_criacao_historico
after insert on cotacoes
for each row execute function registrar_criacao_cotacao();
