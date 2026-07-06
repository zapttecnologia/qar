-- ============================================================
-- DADOS DE EXEMPLO (SEED)
-- Opcional — rode só se quiser ver o esquema funcionando com dados reais.
-- Pressupõe que você já criou ao menos um usuário via Supabase Auth
-- e substituiu o UUID abaixo pelo auth.uid() real desse usuário.
-- ============================================================

-- Substitua este UUID pelo id de um usuário já existente em auth.users
-- (você consegue copiar em Authentication > Users no painel do Supabase)
-- Exemplo: '11111111-1111-1111-1111-111111111111'

do $$
declare
  v_usuario_id uuid := '11111111-1111-1111-1111-111111111111'; -- TROCAR
  v_corretora_id uuid;
  v_time_id uuid;
  v_cotacao_id uuid;
begin

  insert into corretoras (nome, cnpj, plano_assinatura)
  values ('V.Tech Seguros', '12.345.678/0001-99', 'profissional')
  returning id into v_corretora_id;

  insert into times (corretora_id, nome, visivel_para_corretora)
  values (v_corretora_id, 'Time Sul de Minas', false)
  returning id into v_time_id;

  insert into membros (usuario_id, corretora_id, time_id, papel, convite_aceito)
  values (v_usuario_id, v_corretora_id, v_time_id, 'admin', true);

  insert into cotacoes (
    corretora_id, time_id, criado_por,
    cnpj, razao_social, nome_fantasia, atividade_principal,
    endereco, cep, cidade_uf,
    ramo, pct_terrestre,
    qtd_embarques_mes, valor_medio_embarque, valor_maximo_embarque, importancia_segurada,
    status
  ) values (
    v_corretora_id, v_time_id, v_usuario_id,
    '26.955.557/0001-70', 'Empreendimentos Mano Ltda', 'EML', '49.30-2-02 - Transporte rodoviário de carga',
    'R. Padre Moacir Candido Rodrigues, 200, Bairro São Luiz', '35.557-000', 'Carmo do Cajuru / MG',
    'RCTR-C', 100,
    50, 100000.00, 500000.00, 5000000.00,
    'em_analise'
  ) returning id into v_cotacao_id;

  insert into cotacao_mercadorias (cotacao_id, tipo, embarcador, percentual)
  values (v_cotacao_id, 'Veículos novos e usados', null, 100);

  insert into cotacao_percursos (cotacao_id, origem, destino, percentual)
  values (v_cotacao_id, 'MG', 'MG', 100);

  raise notice 'Seed concluído. corretora_id = %, cotacao_id = %', v_corretora_id, v_cotacao_id;

end $$;
