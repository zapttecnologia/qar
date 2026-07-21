import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Verifica super admin
    const { data: sa } = await supabase.from('super_admins').select('id').eq('usuario_id', user.id).single()
    if (!sa) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { usuario_id, nome, email, senha_nova } = await request.json()
    if (!usuario_id) return NextResponse.json({ error: 'usuario_id obrigatório' }, { status: 400 })

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Atualiza Auth (email e/ou senha)
    const authUpdate: Record<string, string> = {}
    if (email) authUpdate.email = email
    if (senha_nova) authUpdate.password = senha_nova

    if (Object.keys(authUpdate).length > 0) {
      const { error } = await admin.auth.admin.updateUserById(usuario_id, authUpdate)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Atualiza tabela usuarios
    if (nome || email) {
      await admin.from('usuarios').update({ nome: nome || undefined, email: email || undefined } as never).eq('id', usuario_id)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}
