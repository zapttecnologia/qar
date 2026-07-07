import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Verifica se o solicitante é admin da corretora
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { nome, email, senha, papel, corretora_id } = await request.json()

    if (!nome || !email || !senha || !papel || !corretora_id) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
    }

    // Verifica se quem está criando é admin da corretora
    const { data: membro } = await supabase
      .from('membros')
      .select('papel')
      .eq('corretora_id', corretora_id)
      .eq('usuario_id', user.id)
      .eq('convite_aceito', true)
      .single()

    const m = membro as { papel: string } | null
    if (!m || m.papel !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem criar usuários.' }, { status: 403 })
    }

    // Verifica limite de usuários do plano
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: podeAdicionar } = await (supabase as any).rpc('pode_adicionar_membro', { p_corretora_id: corretora_id })
    if (podeAdicionar === false) {
      // Busca info do plano para mensagem amigável
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: infoPlano } = await (supabase as any)
        .from('corretoras')
        .select('plano_assinatura, plano_id, planos:plano_id(nome_exibicao, max_usuarios)')
        .eq('id', corretora_id)
        .single()
      const planoInfo = infoPlano as Record<string, unknown> | null
      const maxU = (planoInfo?.planos as Record<string, unknown> | null)?.max_usuarios ?? '?'
      return NextResponse.json({
        error: `Limite de usuários atingido. Seu plano permite até ${maxU} usuário(s). Desative um membro para adicionar outro ou faça upgrade do plano.`
      }, { status: 400 })
    }

    // Cria o usuário usando service role (bypass de Auth)
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verifica se e-mail já existe
    const { data: existente } = await adminSupabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single()

    let novoUserId: string

    if (existente) {
      // Usuário já existe — só vincula à corretora
      novoUserId = (existente as Record<string, string>).id
    } else {
      // Cria novo usuário no Auth
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 400 })
        }
        throw new Error(authError.message)
      }

      novoUserId = authData.user.id

      // Cria o perfil na tabela usuarios
      await adminSupabase.from('usuarios').insert({
        id: novoUserId,
        nome,
        email,
      } as never)
    }

    // Verifica se já é membro
    const { data: membroExistente } = await adminSupabase
      .from('membros')
      .select('id')
      .eq('corretora_id', corretora_id)
      .eq('usuario_id', novoUserId)
      .single()

    if (membroExistente) {
      return NextResponse.json({ error: 'Este usuário já faz parte da equipe.' }, { status: 400 })
    }

    // Vincula à corretora
    await adminSupabase.from('membros').insert({
      corretora_id,
      usuario_id: novoUserId,
      papel,
      convite_aceito: true,
    } as never)

    return NextResponse.json({ ok: true, usuario_id: novoUserId })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[criar-usuario]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
