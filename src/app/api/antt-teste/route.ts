import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BASE_AUTH = 'https://opencheck.arkeyva.com'
const BASE_API  = 'https://opencheck.arkeyva.com/api/datas'
const ID_CLIENTE = process.env.OPENCHECK_ID_CLIENTE ?? ''
const USERNAME   = process.env.OPENCHECK_USERNAME   ?? ''
const PASSWORD   = process.env.OPENCHECK_PASSWORD   ?? ''

const EP_ANTT_RESULTADO = '65bd33851ad8a746ac57fd89'
const FIELD_CNPJ_ANTT   = '660b03c1ab35f6688e9b7d0d'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(request: NextRequest) {
  // Rota de depuração: cada chamada dispara uma consulta paga na OpenCheck,
  // portanto exige sessão autenticada igual à rota /api/antt.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { cnpj } = await request.json()
  const cnpjLimpo = cnpj.replace(/\D/g, '')
  const cnpjMask  = cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')

  // 1. Token
  const tokenRes = await fetch(
    `${BASE_AUTH}/auth/realms/${ID_CLIENTE}/protocol/openid-connect/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: USERNAME, password: PASSWORD, grant_type: 'password', client_id: 'arkeyva' }).toString() }
  )
  const tokenData = await tokenRes.json()
  const token = tokenData.access_token
  if (!token) return NextResponse.json({ erro: 'token falhou', detalhe: tokenData })

  // 2. Disparo com CNPJ formatado
  const disparoRes = await fetch(`${BASE_API}/65bd32551ad8a746ac57fd84`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ CNPJ: cnpjMask }),
  })
  const disparoStatus = disparoRes.status

  // 3. Aguarda e busca com CNPJ formatado
  await sleep(5000)
  const buscaRes = await fetch(`${BASE_API}/${EP_ANTT_RESULTADO}/filter?limit=5`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ typo: 'AND', filters: [{ values: [cnpjMask, ''], conditional: 'EQUAL', field: FIELD_CNPJ_ANTT }] }]),
  })
  const buscaData = await buscaRes.json()

  return NextResponse.json({
    cnpj_limpo: cnpjLimpo,
    cnpj_formatado: cnpjMask,
    disparo_status: disparoStatus,
    busca_total: buscaData?.elements?.length ?? 0,
    busca_resultado: buscaData?.elements?.[0] ?? null,
    busca_raw: buscaData,
  })
}
