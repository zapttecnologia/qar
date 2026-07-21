import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { randomInt } from 'crypto'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { token, cnpj, email } = await request.json()
    if (!token || !cnpj || !email) return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Busca token
    const { data: pt } = await admin.from('portal_tokens').select('*').eq('token', token).single()
    const p = pt as Record<string, unknown> | null

    if (!p) return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 })
    if (new Date(p.expira_em as string) < new Date()) return NextResponse.json({ error: 'Este link expirou. Solicite um novo à corretora.' }, { status: 400 })

    // Valida CNPJ e e-mail
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    const cnpjToken = (p.cnpj as string).replace(/\D/g, '')
    if (cnpjLimpo !== cnpjToken) return NextResponse.json({ error: 'CNPJ não corresponde ao documento enviado.' }, { status: 400 })
    if (email.toLowerCase() !== (p.email as string).toLowerCase()) return NextResponse.json({ error: 'E-mail não corresponde ao cadastro.' }, { status: 400 })

    // Gera código 6 dígitos
    const codigo = String(randomInt(100000, 999999))
    const codigoExpira = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await admin.from('portal_tokens').update({
      codigo, codigo_expira_em: codigoExpira, codigo_tentativas: 0,
    } as never).eq('token', token)

    // Busca config SMTP da corretora via cotação
    const { data: cotacao } = await admin
      .from('cotacoes')
      .select('razao_social, corretora:corretoras(nome, nome_exibicao, email_smtp_host, email_smtp_port, email_smtp_seguranca, email_smtp_usuario, email_smtp_senha, email_remetente_nome, email_remetente_email, cor_primaria)')
      .eq('id', p.cotacao_id as string)
      .single()

    const ct = cotacao as Record<string, unknown> | null
    const cor = (ct?.corretora as Record<string, unknown>) ?? {}
    const smtpUser = cor.email_smtp_usuario as string
    const smtpPass = cor.email_smtp_senha as string
    const remetenteNome = (cor.email_remetente_nome ?? cor.nome_exibicao ?? cor.nome ?? 'QARtech') as string
    const remetenteEmail = (cor.email_remetente_email ?? smtpUser ?? 'noreply@qartech.com.br') as string

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: (cor.email_smtp_host as string) || 'smtp.gmail.com',
        port: Number(cor.email_smtp_port ?? 587),
        secure: cor.email_smtp_seguranca === 'ssl',
        auth: { user: smtpUser, pass: smtpPass },
      })

      await transporter.sendMail({
        from: `"${remetenteNome}" <${remetenteEmail}>`,
        to: email,
        subject: `Seu código de acesso — ${codigo}`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,sans-serif">
<div style="max-width:400px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e6ea">
  <div style="background:#0f2744;padding:20px 24px">
    <span style="font-size:18px;font-weight:700;color:#fff">QAR</span><span style="font-size:18px;font-weight:300;color:#58a5f0">tech</span>
  </div>
  <div style="padding:28px;text-align:center">
    <p style="font-size:14px;color:#4b5563;margin:0 0 24px">Seu código de verificação para acessar o QAR de <strong>${ct?.razao_social ?? ''}</strong>:</p>
    <div style="font-size:42px;font-weight:700;color:#0f2744;letter-spacing:8px;margin:0 0 24px">${codigo}</div>
    <p style="font-size:12px;color:#9ca3af;margin:0">Expira em <strong>10 minutos</strong>. Não compartilhe este código.</p>
  </div>
</div></body></html>`,
      })
    }

    return NextResponse.json({ ok: true, email_mascarado: email.replace(/(.{2}).+(@.+)/, '$1***$2') })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}
