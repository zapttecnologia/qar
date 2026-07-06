import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'

// Pré-sets de SMTP para os provedores mais comuns
const PRESETS: Record<string, { host: string; port: number; secure: boolean }> = {
  gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
  outlook: { host: 'smtp.office365.com', port: 587, secure: false },
  microsoft365: { host: 'smtp.office365.com', port: 587, secure: false },
  yahoo: { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
  imap_tls: { host: '', port: 587, secure: false },
  imap_ssl: { host: '', port: 465, secure: true },
}

interface ConfigEmail {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  remetenteNome: string
  remetenteEmail: string
}

function montarTransporter(config: ConfigEmail) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    tls: { rejectUnauthorized: false }, // aceita certs auto-assinados
  })
}

function templateEmail(dados: {
  remetenteNome: string
  corretoraNome: string
  razaoSocial: string
  cnpj: string
  ramo: string
  importanciaSegurada: string
  corretoraEmail: string
  corretoraFone?: string
}) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:24px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Cabeçalho -->
        <tr><td style="background:#1a3a6b;padding:24px 32px;">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">${dados.corretoraNome}</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,.7);font-size:13px;">Cotação de Seguro de Transportes de Carga</p>
        </td></tr>

        <!-- Corpo -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#333;font-size:14px;">Prezado(a),</p>
          <p style="margin:0 0 24px;color:#333;font-size:14px;line-height:1.6;">
            Segue em anexo o <strong>Questionário de Avaliação de Riscos (QAR)</strong> referente à cotação de seguro de transportes de carga para a empresa abaixo.
          </p>

          <!-- Card com dados -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:6px;padding:20px;margin-bottom:24px;">
            <tr><td>
              <p style="margin:0 0 12px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;">Dados da cotação</p>
              ${[
                ['Empresa', dados.razaoSocial],
                ['CNPJ', dados.cnpj],
                ['Ramo', dados.ramo],
                ['Importância segurada', dados.importanciaSegurada],
              ].map(([k, v]) => `
              <table width="100%" cellpadding="4" cellspacing="0">
                <tr>
                  <td width="40%" style="color:#888;font-size:13px;">${k}:</td>
                  <td style="color:#111;font-size:13px;font-weight:500;">${v}</td>
                </tr>
              </table>`).join('')}
            </td></tr>
          </table>

          <p style="margin:0 0 24px;color:#333;font-size:14px;line-height:1.6;">
            Para prosseguir com a cotação, por favor revise o documento anexo e entre em contato conosco em caso de dúvidas ou informações adicionais.
          </p>

          <p style="margin:0;color:#333;font-size:14px;">Atenciosamente,</p>
          <p style="margin:4px 0 0;color:#1a3a6b;font-size:14px;font-weight:700;">${dados.remetenteNome}</p>
          <p style="margin:2px 0 0;color:#666;font-size:13px;">${dados.corretoraNome}</p>
          ${dados.corretoraFone ? `<p style="margin:2px 0 0;color:#666;font-size:13px;">${dados.corretoraFone}</p>` : ''}
          <p style="margin:2px 0 0;font-size:13px;"><a href="mailto:${dados.corretoraEmail}" style="color:#1a3a6b;">${dados.corretoraEmail}</a></p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #eee;">
          <p style="margin:0;color:#aaa;font-size:11px;text-align:center;">
            Este e-mail foi enviado por ${dados.corretoraNome} através do sistema Cargotech.<br>
            O QAR em anexo é confidencial e destinado exclusivamente ao(s) destinatário(s) acima.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verifica autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const { cotacao_id, destinatario_email, destinatario_nome, mensagem_extra } = body

    if (!cotacao_id || !destinatario_email) {
      return NextResponse.json({ error: 'cotacao_id e destinatario_email são obrigatórios' }, { status: 400 })
    }

    // Busca dados da cotação
    const { data: cotacao } = await supabase
      .from('cotacoes')
      .select('*, corretora:corretoras(*)')
      .eq('id', cotacao_id)
      .single()

    if (!cotacao) return NextResponse.json({ error: 'Cotação não encontrada' }, { status: 404 })

    const corretora = (cotacao as Record<string, unknown>).corretora as Record<string, unknown>

    // Busca dados do usuário logado (corretor)
    const { data: usuarioDados } = await supabase
      .from('usuarios')
      .select('nome, email_smtp_host, email_smtp_port, email_smtp_seguranca, email_smtp_usuario, email_smtp_senha, email_remetente_nome, email_remetente_email')
      .eq('id', user.id)
      .single()

    // ── CASCATA: tenta configuração do corretor primeiro ──────
    let config: ConfigEmail | null = null

    const ud = usuarioDados as Record<string, unknown> | null

    if (ud?.email_smtp_host && ud?.email_smtp_usuario && ud?.email_smtp_senha) {
      config = {
        host: ud.email_smtp_host as string,
        port: (ud.email_smtp_port as number) ?? 587,
        secure: ud.email_smtp_seguranca === 'ssl',
        user: ud.email_smtp_usuario as string,
        pass: ud.email_smtp_senha as string,
        remetenteNome: (ud.email_remetente_nome as string) ?? (ud.nome as string) ?? 'Corretor',
        remetenteEmail: (ud.email_remetente_email as string) ?? (ud.email_smtp_usuario as string),
      }
    }
    // ── Fallback: configuração da corretora ───────────────────
    else if (corretora?.email_smtp_host && corretora?.email_smtp_usuario && corretora?.email_smtp_senha) {
      config = {
        host: corretora.email_smtp_host as string,
        port: (corretora.email_smtp_port as number) ?? 587,
        secure: corretora.email_smtp_seguranca === 'ssl',
        user: corretora.email_smtp_usuario as string,
        pass: corretora.email_smtp_senha as string,
        remetenteNome: (corretora.email_remetente_nome as string) ?? (corretora.nome as string) ?? 'Corretora',
        remetenteEmail: (corretora.email_remetente_email as string) ?? (corretora.email_smtp_usuario as string),
      }
    }

    if (!config) {
      return NextResponse.json({
        error: 'Nenhuma configuração de e-mail encontrada. Configure o e-mail em Configurações ou no seu perfil.'
      }, { status: 400 })
    }

    // ── Gera o PDF em buffer ──────────────────────────────────
    // Import dinâmico pois @react-pdf/renderer é client-only em alguns contextos
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const { QarPDF } = await import('@/components/pdf/QarPDF')
    const { buscarTabelasFilhas } = await import('@/lib/queries/cotacoes_qar')

    const filhas = await buscarTabelasFilhas(cotacao_id)

    const pdfBuffer = await renderToBuffer(
      QarPDF({
        corretora: {
          nome: (corretora.nome as string) ?? '',
          nome_exibicao: corretora.nome_exibicao as string | null,
          logo_url: corretora.logo_url as string | null,
          cor_primaria: corretora.cor_primaria as string | null,
          cor_secundaria: corretora.cor_secundaria as string | null,
          site_url: corretora.site_url as string | null,
        },
        cotacao: cotacao as never,
        mercadorias: filhas.mercadorias as never,
        percursos: filhas.percursos as never,
        expAnterior: filhas.experiencia as never,
        condicaoAtual: filhas.condicaoAtual as never,
        sinistros: filhas.sinistros as never,
        ddrs: filhas.ddrs as never,
        gerenciadoras: filhas.gerenciadoras as never,
        condPretendidas: filhas.condPretendidas as never,
      })
    )

    // ── Monta e envia o e-mail ────────────────────────────────
    const transporter = montarTransporter(config)
    const cot = cotacao as Record<string, unknown>

    const importanciaSegurada = cot.importancia_segurada
      ? `R$ ${Number(cot.importancia_segurada).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : 'Não informada'

    const ramos = Array.isArray(cot.ramos) && (cot.ramos as string[]).length > 0
      ? (cot.ramos as string[]).join(', ')
      : ((cot.ramo as string) ?? 'Não informado')

    const htmlBody = templateEmail({
      remetenteNome: config.remetenteNome,
      corretoraNome: (corretora.nome_exibicao as string) ?? (corretora.nome as string) ?? '',
      razaoSocial: (cot.razao_social as string) ?? (cot.cnpj as string),
      cnpj: cot.cnpj as string,
      ramo: ramos,
      importanciaSegurada,
      corretoraEmail: config.remetenteEmail,
      corretoraFone: corretora.telefone_contato as string | undefined,
    })

    const nomeArquivo = `QAR-${((cot.razao_social as string) ?? (cot.cnpj as string)).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.pdf`

    await transporter.sendMail({
      from: `"${config.remetenteNome}" <${config.remetenteEmail}>`,
      to: destinatario_nome ? `"${destinatario_nome}" <${destinatario_email}>` : destinatario_email,
      subject: `QAR — Cotação de Seguro de Transportes | ${(cot.razao_social as string) ?? (cot.cnpj as string)}`,
      html: htmlBody,
      text: mensagem_extra ?? '',
      attachments: [
        {
          filename: nomeArquivo,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    // Registra no histórico da cotação
    await supabase.from('historico_cotacao').insert({
      cotacao_id,
      usuario_id: user.id,
      evento: 'email_enviado',
      detalhes: { destinatario: destinatario_email, remetente: config.remetenteEmail },
    } as never)

    return NextResponse.json({ ok: true, remetente: config.remetenteEmail })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[enviar-email]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
