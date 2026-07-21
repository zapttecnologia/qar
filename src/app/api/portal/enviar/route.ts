import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { cotacao_id } = await request.json()
    if (!cotacao_id) return NextResponse.json({ error: 'cotacao_id obrigatório' }, { status: 400 })

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: cotacao } = await supabase
      .from('cotacoes')
      .select('*, corretora:corretoras(nome, nome_exibicao, email_smtp_host, email_smtp_port, email_smtp_seguranca, email_smtp_usuario, email_smtp_senha, email_remetente_nome, email_remetente_email, cor_primaria)')
      .eq('id', cotacao_id)
      .single()

    if (!cotacao) return NextResponse.json({ error: 'Cotação não encontrada' }, { status: 404 })
    const c = cotacao as Record<string, unknown>
    const cor = c.corretora as Record<string, unknown>

    if (!c.contato_email) return NextResponse.json({ error: 'A cotação não tem e-mail de contato da transportadora.' }, { status: 400 })

    const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')

    await admin.from('portal_tokens').insert({
      cotacao_id, cnpj: c.cnpj as string,
      email: c.contato_email as string, token,
      expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    } as never)

    await supabase.from('cotacoes').update({
      portal_status: 'enviado', portal_enviado_em: new Date().toISOString(),
    } as never).eq('id', cotacao_id)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://qartech.vercel.app'
    const portalUrl = `${baseUrl}/portal/${token}`
    const corP = (cor.cor_primaria as string) || '#0f2744'
    const remetenteNome = (cor.email_remetente_nome ?? cor.nome_exibicao ?? cor.nome) as string
    const smtpUser = cor.email_smtp_usuario as string
    const smtpPass = cor.email_smtp_senha as string
    const remetenteEmail = (cor.email_remetente_email ?? smtpUser) as string

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: (cor.email_smtp_host as string) || 'smtp.gmail.com',
        port: Number(cor.email_smtp_port ?? 587),
        secure: cor.email_smtp_seguranca === 'ssl',
        auth: { user: smtpUser, pass: smtpPass },
      })

      await transporter.sendMail({
        from: `"${remetenteNome}" <${remetenteEmail}>`,
        to: c.contato_email as string,
        subject: `QAR para revisão — ${c.razao_social ?? c.cnpj}`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e6ea">
  <div style="background:${corP};padding:24px 28px">
    <span style="font-size:22px;font-weight:700;color:#fff">QAR</span><span style="font-size:22px;font-weight:300;color:#58a5f0">tech</span>
    <div style="font-size:10px;color:rgba(255,255,255,.4);letter-spacing:2px;text-transform:uppercase;margin-top:4px">sistema de cotações</div>
  </div>
  <div style="padding:28px">
    <p style="font-size:15px;font-weight:600;color:#111827;margin:0 0 8px">Olá, ${c.contato_nome ?? 'prezado(a)'}!</p>
    <p style="font-size:14px;color:#4b5563;margin:0 0 20px;line-height:1.6">A corretora <strong>${remetenteNome}</strong> enviou um <strong>Questionário de Avaliação de Riscos (QAR)</strong> para sua revisão.</p>
    <div style="background:#f9fafb;border-radius:8px;padding:14px 16px;margin-bottom:20px">
      <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Dados do questionário</div>
      <div style="font-size:13px;color:#374151;margin-bottom:4px"><strong>Empresa:</strong> ${c.razao_social ?? '—'}</div>
      <div style="font-size:13px;color:#374151;margin-bottom:4px"><strong>CNPJ:</strong> ${c.cnpj ?? '—'}</div>
      <div style="font-size:13px;color:#374151"><strong>Ramo:</strong> ${c.ramo ?? '—'}</div>
    </div>
    <a href="${portalUrl}" style="display:block;text-align:center;background:${corP};color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-bottom:16px">Acessar e revisar o QAR →</a>
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0">Este link expira em 7 dias. Você precisará confirmar seu CNPJ e e-mail para acessar.</p>
  </div>
  <div style="background:#f9fafb;padding:14px 28px;border-top:1px solid #e2e6ea">
    <p style="font-size:11px;color:#9ca3af;margin:0;text-align:center">${remetenteNome} · Enviado via QARtech</p>
  </div>
</div></body></html>`,
      })
    }

    return NextResponse.json({ ok: true, portal_url: portalUrl })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}
