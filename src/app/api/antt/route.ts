import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BASE_AUTH = 'https://opencheck.arkeyva.com'
const BASE_API  = 'https://opencheck.arkeyva.com/api/datas'

const OPENCHECK_ID_CLIENTE = process.env.OPENCHECK_ID_CLIENTE ?? ''
const OPENCHECK_USERNAME   = process.env.OPENCHECK_USERNAME   ?? ''
const OPENCHECK_PASSWORD   = process.env.OPENCHECK_PASSWORD   ?? ''

// Endpoints — apenas ANTT (Receita usa BrasilAPI gratuita)
const EP_ANTT_CONSULTA  = '65bd32551ad8a746ac57fd84'
const EP_ANTT_RESULTADO = '65bd33851ad8a746ac57fd89'

// Field ID do CNPJ no endpoint de resultado ANTT
const FIELD_CNPJ_ANTT = '660b03c1ab35f6688e9b7d0d'

let tokenCache: { token: string; expira: number } | null = null
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// OpenCheck armazena CNPJ com máscara: XX.XXX.XXX/XXXX-XX
function formatarCNPJ(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '').slice(0, 14)
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

function credenciaisOk() {
  return OPENCHECK_ID_CLIENTE && OPENCHECK_USERNAME && OPENCHECK_PASSWORD
}

async function obterToken(): Promise<string> {
  if (tokenCache && tokenCache.expira > Date.now() + 30000) return tokenCache.token
  const res = await fetch(
    `${BASE_AUTH}/auth/realms/${OPENCHECK_ID_CLIENTE}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: OPENCHECK_USERNAME, password: OPENCHECK_PASSWORD,
        grant_type: 'password', client_id: 'arkeyva',
      }).toString(),
    }
  )
  if (!res.ok) throw new Error(`Auth falhou: ${res.status} — ${await res.text()}`)
  const d = await res.json()
  tokenCache = { token: d.access_token, expira: Date.now() + Number(d.expires_in ?? 300) * 1000 }
  return tokenCache.token
}

async function disparar(token: string, endpoint: string, body: Record<string, string>) {
  const res = await fetch(`${BASE_API}/${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.ok
}

// A OpenCheck cria o registro vazio no disparo e só preenche ~1min depois.
// AnaliseStatus já vem no registro-placeholder, então NÃO serve como sinal de conclusão —
// só os campos de conteúdo indicam que a análise terminou.
function analiseConcluida(el: Record<string, unknown>): boolean {
  const rntrc     = (el.RNTRC            as string | null)?.trim()
  const detalhe   = (el.AnaliseDetalhe   as string | null)?.trim()
  const resultado = (el.AnaliseResultado as string | null)?.trim()
  return !!(rntrc || detalhe || resultado)
}

async function buscar(token: string, endpoint: string, fieldId: string, cnpj: string) {
  // OpenCheck armazena CNPJ com máscara — usar formato XX.XXX.XXX/XXXX-XX no filter
  const cnpjFormatado = formatarCNPJ(cnpj)
  console.log(`[opencheck] buscando com CNPJ formatado: ${cnpjFormatado}`)
  const res = await fetch(`${BASE_API}/${endpoint}/filter?limit=5`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      typo: 'AND',
      filters: [{ values: [cnpjFormatado, ''], conditional: 'EQUAL', field: fieldId }],
    }]),
  })
  if (!res.ok) {
    console.log(`[opencheck] buscar erro: ${res.status}`)
    return null
  }
  const data = await res.json()
  const elements: Record<string, unknown>[] = data?.elements ?? data?.data?.elements ?? []
  const concluidos = elements.filter(analiseConcluida)
  console.log(`[opencheck] buscar ${endpoint}: total=${elements.length} concluidos=${concluidos.length}`)
  if (!concluidos.length) return null
  // Pega o mais recente por _sequence (a ordem devolvida pela API não é garantida)
  return concluidos.reduce((a, b) => (Number(b._sequence ?? 0) > Number(a._sequence ?? 0) ? b : a))
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    if (!credenciaisOk()) {
      return NextResponse.json({ erro: 'credenciais_ausentes', mensagem: 'Credenciais OpenCheck não configuradas.' }, { status: 503 })
    }

    const body = await request.json()
    const { cnpj, apenas_buscar } = body
    if (!cnpj) return NextResponse.json({ error: 'CNPJ obrigatório' }, { status: 400 })
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 })

    const token = await obterToken()

    // ── Modo apenas buscar (polling do frontend) ──────────────
    if (apenas_buscar) {
      const antt = await buscar(token, EP_ANTT_RESULTADO, FIELD_CNPJ_ANTT, cnpjLimpo)
      if (!antt) return NextResponse.json({ pendente: true }, { status: 202 })
      return NextResponse.json({ ok: true, ...montarANTT(antt) })
    }

    // ── Fluxo principal: dispara apenas consulta ANTT ─────────
    const cnpjFormatado = formatarCNPJ(cnpjLimpo)
    await disparar(token, EP_ANTT_CONSULTA, { CNPJ: cnpjFormatado })

    // Aguarda 6s e busca resultado
    await sleep(6000)
    const antt = await buscar(token, EP_ANTT_RESULTADO, FIELD_CNPJ_ANTT, cnpjLimpo)

    if (antt) return NextResponse.json({ ok: true, ...montarANTT(antt) })

    // Ainda processando
    return NextResponse.json({ pendente: true, mensagem: 'Processando...' }, { status: 202 })

  } catch (e) {
    console.error('[opencheck]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}

// ── Monta resposta unificada ──────────────────────────────────
function montarANTT(antt: Record<string, unknown> | null) {
  if (!antt) return { rntrc: null, antt_ativo: false, situacao_antt: null, status_label: 'Não localizado', status_cor: 'vermelho' as const, detalhe: null }

  // Campo direto RNTRC
  let rntrc = (antt.RNTRC as string)?.trim() || null
  let situacao: string | null = null

  // Extrai RNTRC e Situação do AnaliseDetalhe
  const detalhe = (antt.AnaliseDetalhe as string) ?? ''
  if (detalhe) {
    if (!rntrc) {
      const partes = detalhe.split('RNTRC:')
      if (partes.length > 1) {
        const raw = partes[1].split('\n')[0].trim()
        if (raw) rntrc = raw
      }
    }
    const sitPartes = detalhe.split('Situa')
    if (sitPartes.length > 1) {
      const sitRaw = sitPartes[1].split('\n')[0]
      const sitMatch = sitRaw.split(':')
      if (sitMatch.length > 1) situacao = sitMatch[1].trim().toUpperCase()
    }
  }

  const statusKey  = ((antt.AnaliseStatus as {key:string}[])?.[0]?.key ?? '').toUpperCase()
  const codigoKey  = ((antt.AnaliseCodigo as {key:string}[])?.[0]?.key ?? '').toUpperCase()
  const realizado  = statusKey === 'REALIZADO'
  const consultaOk = codigoKey === 'CODIGO_1' || codigoKey === 'CODIGO1'
  const anttAtivo  = situacao === 'ATIVO' || (!!(rntrc) && (realizado || consultaOk))

  const status_cor = anttAtivo ? 'verde' as const : rntrc ? 'amarelo' as const : 'vermelho' as const

  return {
    rntrc,
    antt_ativo:    anttAtivo,
    situacao_antt: situacao,
    status_label:  anttAtivo ? 'Ativo' : rntrc ? 'Em revisão' : 'Não localizado',
    status_cor,
    detalhe,
  }
}
