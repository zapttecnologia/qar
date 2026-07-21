import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { token, acao, mensagem } = await request.json()
    if (!token || !acao) return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: pt } = await admin.from('portal_tokens').select('*').eq('token', token).single()
    const p = pt as Record<string, unknown> | null
    if (!p || !p.acessado_em) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 })

    const agora = new Date().toISOString()
    await admin.from('portal_tokens').update({ acao, mensagem_ajuste: mensagem ?? null, confirmado_em: agora } as never).eq('token', token)

    const portalStatus = acao === 'confirmado' ? 'confirmado'
      : acao === 'ajuste' ? 'ajuste_solicitado'
      : 'confirmado'

    await admin.from('cotacoes').update({
      portal_status: portalStatus,
      portal_confirmado_em: agora,
      portal_mensagem_ajuste: mensagem ?? null,
    } as never).eq('id', p.cotacao_id as string)

    return NextResponse.json({ ok: true, acao })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}
