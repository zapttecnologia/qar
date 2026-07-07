import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Verifica se é super admin
    const { data: superAdmin } = await supabase
      .from('super_admins').select('id').eq('usuario_id', user.id).single()
    if (!superAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const { nome, cnpj, plano_id, plano_obs, admin_nome, admin_email, admin_senha } = await request.json()

    if (!nome || !plano_id || !admin_nome || !admin_email || !admin_senha) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 })
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Busca dados do plano
    const { data: plano } = await admin.from('planos').select('*').eq('id', plano_id).single()
    if (!plano) return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 400 })
    const p = plano as Record<string, unknown>

    // Calcula vencimento se plano tiver duração
    const vencimento = p.duracao_dias
      ? new Date(Date.now() + Number(p.duracao_dias) * 86400000).toISOString().split('T')[0]
      : null

    // 2. Cria a corretora
    const { data: corretora, error: errCor } = await admin
      .from('corretoras')
      .insert({
        nome,
        cnpj: cnpj || null,
        plano_id,
        plano_assinatura: p.nome as string,
        plano_valor: p.valor_mensal as number,
        plano_vencimento: vencimento,
        plano_obs: plano_obs || null,
        status_assinatura: 'ativa',
      } as never)
      .select()
      .single()

    if (errCor) throw new Error(errCor.message)
    const cor = corretora as Record<string, unknown>

    // 3. Cria o usuário admin
    let adminUserId: string

    // Verifica se e-mail já existe
    const { data: existente } = await admin
      .from('usuarios').select('id').eq('email', admin_email).single()

    if (existente) {
      adminUserId = (existente as Record<string, string>).id
    } else {
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email: admin_email,
        password: admin_senha,
        email_confirm: true,
        user_metadata: { nome: admin_nome },
      })
      if (authError) throw new Error(`Erro ao criar usuário: ${authError.message}`)
      adminUserId = authData.user.id

      // Cria perfil
      await admin.from('usuarios').insert({
        id: adminUserId,
        nome: admin_nome,
        email: admin_email,
      } as never)
    }

    // 4. Vincula como admin da corretora
    const { error: membroErr } = await admin.from('membros').insert({
      corretora_id: cor.id as string,
      usuario_id: adminUserId,
      papel: 'admin',
      convite_aceito: true,
    } as never)

    if (membroErr) throw new Error(`Erro ao vincular admin: ${membroErr.message}`)

    return NextResponse.json({
      ok: true,
      corretora_id: cor.id,
      admin_user_id: adminUserId,
      plano: p.nome_exibicao,
      max_usuarios: p.max_usuarios,
      vencimento,
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[criar-corretora]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
