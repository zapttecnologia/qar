@AGENTS.md

# QARtech — SaaS de Cotação de Seguro de Transporte de Carga

## Stack
- Next.js 16 + TypeScript
- Supabase (banco + auth + storage)
- Vercel (deploy automático via push no GitHub)
- Tabler Icons (CDN)

## Estrutura principal
- /src/app/(dashboard)/ — área da corretora
- /src/app/admin/ — painel super admin (roxo)
- /src/app/api/ — API routes
- /src/components/ — componentes reutilizáveis
- /src/hooks/ — hooks (useSessao, useANTT, useCotacoes)
- /src/lib/queries/ — queries do Supabase
- /src/types/database.ts — tipos TypeScript

## Comandos úteis
- npm run dev — servidor local em localhost:3000
- npm run build — build de produção
- git add . && git commit -m "msg" && git push — deploy no Vercel

## Regras importantes
- Sempre usar style inline (não Tailwind) nos componentes novos
- Variáveis CSS: --bg-card, --bg-page, --border-color, --text-1, --text-2, --text-3, --accent
- Supabase client: usar createClient de @/lib/supabase/client
- Nunca editar .env.local

## Banco de dados (Supabase)
- Tabelas principais: corretoras, membros, usuarios, cotacoes, clientes, planos, cobrancas, super_admins
- RLS ativo em todas as tabelas
- Função is_super_admin() para verificar super admin

## Integração OpenCheck (ANTT)
- API route: /api/antt
- Credenciais via .env.local (OPENCHECK_ID_CLIENTE, OPENCHECK_USERNAME, OPENCHECK_PASSWORD)
- Retorna RNTRC e status pelo CNPJ formatado (XX.XXX.XXX/XXXX-XX)

## Deploy
- Push no GitHub → Vercel deploya automaticamente
- Variáveis de ambiente no Vercel (não no .env.local)
