import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── ClickSign ────────────────────────────────────────────────
async function enviarClickSign(params: {
  apiKey: string
  pdfBuffer: Buffer
  nomeArquivo: string
  signatarioNome: string
  signatarioEmail: string
  cotacaoId: string
}) {
  const base = 'https://sandbox.clicksign.com' // troca para app.clicksign.com em produção

  // 1. Upload do documento
  const uploadRes = await fetch(`${base}/api/v1/documents?access_token=${params.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document: {
        path: `/${params.nomeArquivo}`,
        content_base64: `data:application/pdf;base64,${params.pdfBuffer.toString('base64')}`,
        deadline_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
        auto_close: true,
        locale: 'pt-BR',
        sequence_enabled: false,
      }
    }),
  })

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`ClickSign upload falhou: ${err}`)
  }

  const { document } = await uploadRes.json()
  const docKey = document.key

  // 2. Adiciona signatário
  const sigRes = await fetch(`${base}/api/v1/signers?access_token=${params.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signer: {
        email: params.signatarioEmail,
        phone_number: '',
        auths: ['email'],
        name: params.signatarioNome,
        documentation: '',
        birthday: '',
        has_documentation: false,
      }
    }),
  })

  const { signer } = await sigRes.json()

  // 3. Vincula signatário ao documento
  await fetch(`${base}/api/v1/lists?access_token=${params.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      list: {
        document_key: docKey,
        signer_key: signer.key,
        sign_as: 'sign',
      }
    }),
  })

  // 4. Notifica signatário
  await fetch(`${base}/api/v1/notifications?access_token=${params.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        document_key: docKey,
        message: `Olá ${params.signatarioNome}, você recebeu um Questionário de Avaliação de Riscos para assinar digitalmente.`,
      }
    }),
  })

  return {
    documentoKey: docKey,
    link: `${base}/sign/${docKey}`,
  }
}

// ── D4Sign ────────────────────────────────────────────────────
async function enviarD4Sign(params: {
  apiKey: string
  apiSecret: string
  cofreUuid: string
  pdfBuffer: Buffer
  nomeArquivo: string
  signatarioNome: string
  signatarioEmail: string
}) {
  const base = 'https://sandbox.d4sign.com.br/api/v1'
  const auth = `?tokenAPI=${params.apiKey}&cryptKey=${params.apiSecret}`

  // 1. Upload do documento no cofre
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(params.pdfBuffer)], { type: 'application/pdf' }), params.nomeArquivo)

  const uploadRes = await fetch(`${base}/documents/${params.cofreUuid}/upload${auth}`, {
    method: 'POST',
    body: formData,
  })

  if (!uploadRes.ok) throw new Error(`D4Sign upload falhou: ${await uploadRes.text()}`)
  const { uuid: docUuid } = await uploadRes.json()

  // 2. Adiciona signatário
  await fetch(`${base}/documents/${docUuid}/createlist${auth}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signers: [{
        email: params.signatarioEmail,
        act: '1', // 1 = assinar
        foreign: '0',
        certificadoicpbr: '0',
        assinatura_presencial: '0',
        docauth: '0',
        docauthandselfie: '0',
        embed_methodauth: 'email',
        embed_smsnumber: '',
      }]
    }),
  })

  // 3. Envia para assinatura
  await fetch(`${base}/documents/${docUuid}/sendtosigner${auth}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Olá ${params.signatarioNome}, você recebeu um QAR para assinar digitalmente.`,
      workflow: '0',
    }),
  })

  return {
    documentoKey: docUuid,
    link: `https://secure.d4sign.com.br/sign/${docUuid}`,
  }
}

// ── DocuSign ──────────────────────────────────────────────────
async function enviarDocuSign(params: {
  apiKey: string
  accountId: string
  pdfBuffer: Buffer
  nomeArquivo: string
  signatarioNome: string
  signatarioEmail: string
}) {
  // DocuSign usa OAuth2 — aqui simplificado com token direto (integração key)
  const base = `https://demo.docusign.net/restapi/v2.1/accounts/${params.accountId}`

  const envelopeRes = await fetch(`${base}/envelopes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      emailSubject: 'QAR — Questionário de Avaliação de Riscos para assinatura',
      documents: [{
        documentBase64: params.pdfBuffer.toString('base64'),
        name: params.nomeArquivo,
        fileExtension: 'pdf',
        documentId: '1',
      }],
      recipients: {
        signers: [{
          email: params.signatarioEmail,
          name: params.signatarioNome,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [{
              anchorString: 'Assinatura e carimbo do proponente',
              anchorUnits: 'words',
              anchorXOffset: '0',
              anchorYOffset: '10',
            }]
          }
        }]
      },
      status: 'sent',
    }),
  })

  if (!envelopeRes.ok) throw new Error(`DocuSign falhou: ${await envelopeRes.text()}`)
  const { envelopeId } = await envelopeRes.json()

  return {
    documentoKey: envelopeId,
    link: `https://demo.docusign.net/sign/view/${envelopeId}`,
  }
}

// ── Handler principal ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { cotacao_id, signatario_email, signatario_nome } = await request.json()
    if (!cotacao_id || !signatario_email) {
      return NextResponse.json({ error: 'cotacao_id e signatario_email são obrigatórios' }, { status: 400 })
    }

    // Busca cotação + corretora
    const { data: cotacao } = await supabase
      .from('cotacoes')
      .select('*, corretora:corretoras(*)')
      .eq('id', cotacao_id)
      .single()

    if (!cotacao) return NextResponse.json({ error: 'Cotação não encontrada' }, { status: 404 })

    const cor = (cotacao as Record<string, unknown>).corretora as Record<string, unknown>

    if (!cor?.assinatura_provedor || !cor?.assinatura_api_key) {
      return NextResponse.json({
        error: 'Provedor de assinatura não configurado. Configure em Configurações → Assinatura Eletrônica.'
      }, { status: 400 })
    }

    // Gera o PDF
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const { QarPDF } = await import('@/components/pdf/QarPDF')
    const { buscarTabelasFilhas } = await import('@/lib/queries/cotacoes_qar')

    const filhas = await buscarTabelasFilhas(cotacao_id)
    const cot = cotacao as Record<string, unknown>

    const pdfBuffer = await renderToBuffer(
      QarPDF({
        corretora: {
          nome: cor.nome as string,
          nome_exibicao: cor.nome_exibicao as string | null,
          logo_url: cor.logo_url as string | null,
          cor_primaria: cor.cor_primaria as string | null,
          cor_secundaria: cor.cor_secundaria as string | null,
          site_url: cor.site_url as string | null,
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

    const nomeArquivo = `QAR-${((cot.razao_social as string) ?? (cot.cnpj as string)).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.pdf`

    // Envia para o provedor configurado
    let resultado: { documentoKey: string; link: string }

    const provedor = cor.assinatura_provedor as string
    const apiKey = cor.assinatura_api_key as string

    if (provedor === 'clicksign') {
      resultado = await enviarClickSign({
        apiKey,
        pdfBuffer,
        nomeArquivo,
        signatarioNome: signatario_nome ?? 'Signatário',
        signatarioEmail: signatario_email,
        cotacaoId: cotacao_id,
      })
    } else if (provedor === 'd4sign') {
      resultado = await enviarD4Sign({
        apiKey,
        apiSecret: cor.assinatura_api_secret as string ?? '',
        cofreUuid: cor.assinatura_cofre_uuid as string ?? '',
        pdfBuffer,
        nomeArquivo,
        signatarioNome: signatario_nome ?? 'Signatário',
        signatarioEmail: signatario_email,
      })
    } else if (provedor === 'docusign') {
      resultado = await enviarDocuSign({
        apiKey,
        accountId: cor.assinatura_account_id as string ?? '',
        pdfBuffer,
        nomeArquivo,
        signatarioNome: signatario_nome ?? 'Signatário',
        signatarioEmail: signatario_email,
      })
    } else {
      return NextResponse.json({ error: `Provedor "${provedor}" não suportado` }, { status: 400 })
    }

    // Atualiza status na cotação
    await supabase.from('cotacoes').update({
      assinatura_status: 'pendente',
      assinatura_documento_key: resultado.documentoKey,
      assinatura_link: resultado.link,
      assinatura_enviado_em: new Date().toISOString(),
    } as never).eq('id', cotacao_id)

    // Registra no histórico
    await supabase.from('historico_cotacao').insert({
      cotacao_id,
      usuario_id: user.id,
      evento: 'assinatura_enviada',
      detalhes: {
        provedor,
        signatario: signatario_email,
        documento_key: resultado.documentoKey,
      },
    } as never)

    return NextResponse.json({
      ok: true,
      provedor,
      link: resultado.link,
      documentoKey: resultado.documentoKey,
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[assinatura]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
