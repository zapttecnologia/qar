import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { token, codigo } = await request.json()
    if (!token || !codigo) return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: pt } = await admin.from('portal_tokens').select('*').eq('token', token).single()
    const p = pt as Record<string, unknown> | null

    if (!p) return NextResponse.json({ error: 'Token inválido.' }, { status: 404 })
    if (!p.codigo) return NextResponse.json({ error: 'Solicite um novo código.' }, { status: 400 })
    if (new Date(p.codigo_expira_em as string) < new Date()) return NextResponse.json({ error: 'Código expirado. Solicite um novo.' }, { status: 400 })
    if (Number(p.codigo_tentativas) >= 3) return NextResponse.json({ error: 'Muitas tentativas. Solicite um novo código.' }, { status: 400 })
    if (p.codigo !== codigo) {
      await admin.from('portal_tokens').update({ codigo_tentativas: Number(p.codigo_tentativas) + 1 } as never).eq('token', token)
      return NextResponse.json({ error: 'Código incorreto.' }, { status: 400 })
    }

    // Código válido — registra acesso
    await admin.from('portal_tokens').update({ acessado_em: new Date().toISOString() } as never).eq('token', token)
    await admin.from('cotacoes').update({ portal_status: 'visualizado' } as never).eq('id', p.cotacao_id as string)

    // Busca dados completos da cotação
    const { data: cotacao } = await admin
      .from('cotacoes')
      .select('*, corretora:corretoras(nome, nome_exibicao, cor_primaria, logo_url, email_contato, telefone_contato)')
      .eq('id', p.cotacao_id as string)
      .single()

    return NextResponse.json({ ok: true, cotacao })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}
