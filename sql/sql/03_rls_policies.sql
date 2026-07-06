-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Isolamento de dados por corretora, aplicado no banco de dados.
-- Mesmo se o frontend tiver um bug, o Postgres não deixa um usuário
-- ler ou escrever dados de outra corretora.
-- ============================================================

alter table corretoras enable row level security;
alter table usuarios enable row level security;
alter table times enable row level security;
alter table membros enable row level security;
alter table cotacoes enable row level security;
alter table cotacao_mercadorias enable row level security;
alter table cotacao_percursos enable row level security;
alter table cotacao_sinistros enable row level security;
alter table cotacao_gerenciamento_risco enable row level security;
alter table historico_cotacao enable row level security;

-- ============================================================
-- corretoras
-- Só vê a própria corretora. Só admin edita dados da corretora.
-- ============================================================

create policy "ver_propria_corretora"
on corretoras for select
using (id in (select auth_corretora_ids()));

create policy "admin_edita_corretora"
on corretoras for update
using (auth_papel_em(id) = 'admin');

-- ============================================================
-- usuarios
-- Qualquer usuário autenticado pode ver perfis básicos de
-- pessoas que compartilham ao menos uma corretora com ele.
-- ============================================================

create policy "ver_usuarios_da_mesma_corretora"
on usuarios for select
using (
  id = auth.uid()
  or id in (
    select m2.usuario_id
    from membros m1
    join membros m2 on m2.corretora_id = m1.corretora_id
    where m1.usuario_id = auth.uid()
  )
);

create policy "usuario_edita_proprio_perfil"
on usuarios for update
using (id = auth.uid());

-- ============================================================
-- times
-- Visível para quem pertence à corretora. Só admin cria/edita times.
-- ============================================================

create policy "ver_times_da_corretora"
on times for select
using (corretora_id in (select auth_corretora_ids()));

create policy "admin_gerencia_times"
on times for all
using (auth_papel_em(corretora_id) = 'admin');

-- ============================================================
-- membros
-- Vê outros membros da mesma corretora. Só admin convida/edita papéis.
-- ============================================================

create policy "ver_membros_da_corretora"
on membros for select
using (corretora_id in (select auth_corretora_ids()));

create policy "admin_gerencia_membros"
on membros for insert
with check (auth_papel_em(corretora_id) = 'admin');

create policy "admin_atualiza_membros"
on membros for update
using (auth_papel_em(corretora_id) = 'admin');

create policy "admin_remove_membros"
on membros for delete
using (auth_papel_em(corretora_id) = 'admin');

-- ============================================================
-- cotacoes
-- A política central: isolamento por corretora + visibilidade por time.
-- ============================================================

create policy "ver_cotacoes_permitidas"
on cotacoes for select
using (
  corretora_id in (select auth_corretora_ids())
  and pode_ver_cotacao(corretora_id, time_id)
);

create policy "criar_cotacao"
on cotacoes for insert
with check (
  corretora_id in (select auth_corretora_ids())
  and auth_papel_em(corretora_id) in ('admin', 'aprovador', 'corretor')
  and criado_por = auth.uid()
);

create policy "editar_cotacao_permitida"
on cotacoes for update
using (
  corretora_id in (select auth_corretora_ids())
  and (
    auth_papel_em(corretora_id) in ('admin', 'aprovador')
    or criado_por = auth.uid()
  )
);

create policy "excluir_cotacao_permitida"
on cotacoes for delete
using (
  auth_papel_em(corretora_id) in ('admin', 'aprovador')
  or criado_por = auth.uid()
);

-- ============================================================
-- Tabelas filhas de cotacoes (mercadorias, percursos, sinistros, etc.)
-- Herdam a visibilidade da cotação pai via subconsulta.
-- ============================================================

create policy "acessa_mercadorias_da_cotacao_visivel"
on cotacao_mercadorias for select
using (
  cotacao_id in (select id from cotacoes)
);

create policy "edita_mercadorias_da_cotacao_visivel"
on cotacao_mercadorias for all
using (cotacao_id in (select id from cotacoes))
with check (cotacao_id in (select id from cotacoes));

create policy "acessa_percursos_da_cotacao_visivel"
on cotacao_percursos for select
using (
  cotacao_id in (select id from cotacoes)
);

create policy "edita_percursos_da_cotacao_visivel"
on cotacao_percursos for all
using (cotacao_id in (select id from cotacoes))
with check (cotacao_id in (select id from cotacoes));

create policy "acessa_sinistros_da_cotacao_visivel"
on cotacao_sinistros for select
using (
  cotacao_id in (select id from cotacoes)
);

create policy "edita_sinistros_da_cotacao_visivel"
on cotacao_sinistros for all
using (cotacao_id in (select id from cotacoes))
with check (cotacao_id in (select id from cotacoes));

create policy "acessa_gerenciamento_da_cotacao_visivel"
on cotacao_gerenciamento_risco for select
using (
  cotacao_id in (select id from cotacoes)
);

create policy "edita_gerenciamento_da_cotacao_visivel"
on cotacao_gerenciamento_risco for all
using (cotacao_id in (select id from cotacoes))
with check (cotacao_id in (select id from cotacoes));

-- ============================================================
-- historico_cotacao
-- Leitura segue a visibilidade da cotação. Escrita é só via trigger/backend.
-- ============================================================

create policy "ver_historico_da_cotacao_visivel"
on historico_cotacao for select
using (
  cotacao_id in (select id from cotacoes)
);

create policy "inserir_historico"
on historico_cotacao for insert
with check (
  cotacao_id in (select id from cotacoes)
);
