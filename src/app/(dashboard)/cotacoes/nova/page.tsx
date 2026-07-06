'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Search, Loader2, Plus, Trash2 } from 'lucide-react'
import { useSessao } from '@/hooks/useSessao'
import { criarCotacao, atualizarCotacao } from '@/lib/queries/cotacoes'
import { salvarMercadorias, salvarPercursos } from '@/lib/queries/cotacoes'
import { salvarTabelaFilha } from '@/lib/queries/cotacoes_qar'
import { buscarClientePorCNPJ, criarCliente } from '@/lib/queries/clientes'
import { buscarDadosCNPJ, formatCNPJ, validarCNPJ } from '@/lib/utils'
import type { RamoSeguro } from '@/types/database'

// ── Tipos de linha das tabelas dinâmicas ─────────────────────
type LinhaExp    = { seguradora: string; corretor: string; ramo: string; vigencia: string; premio_pago: string }
type LinhaCond   = { lmg: string; ramo: string; taxa: string; pos: string; premio_minimo: string }
type LinhaMerc   = { tipo: string; embarcador: string; percentual: number }
type LinhaPerc   = { origem: string; destino: string; percentual: number }
type LinhaDDR    = { embarcador: string; seguradora: string; lmg: string; vigencia: string }
type LinhaGerc   = { gerenciadora: string; possui_cadastro: boolean; possui_vitimologia: boolean; possui_monitoramento: boolean }
type LinhaCondP  = { lmg: string; ramo: string; taxa: string; pos_franquia: string; premio_minimo: string }
type LinhaSin    = { data_sinistro: string; ramo: string; local_origem: string; local_destino: string; valor_prejuizo: string }

const RAMOS: RamoSeguro[] = ['RCTR-C', 'RC-DC', 'RCTA-C', 'RCT-OM', 'RCTR-VI', 'RCA-C']
const ETAPAS = ['Cadastro', 'Ramos', 'Operação', 'Histórico', 'Riscos', 'Condições']

// ── Componentes de apoio ─────────────────────────────────────
function StepHeader({ etapa, total }: { etapa: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
      {ETAPAS.map((e, i) => {
        const n = i + 1
        const done = etapa > n
        const active = etapa === n
        return (
          <div key={e} className="flex items-center gap-1.5 flex-shrink-0">
            <div className={`flex items-center gap-1.5 ${active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0
                ${active ? 'bg-blue-900 text-white' : done ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                {done ? <Check className="w-3 h-3" /> : n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{e}</span>
            </div>
            {i < total - 1 && <div className="w-4 h-px bg-gray-200 dark:bg-gray-700" />}
          </div>
        )
      })}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{children}</label>
}

function Input({ value, onChange, placeholder, type = 'text', className = '' }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string
}) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
    />
  )
}

function PctTotal({ campos }: { campos: number[] }) {
  const total = campos.reduce((s, v) => s + (v || 0), 0)
  if (total === 0) return null
  return (
    <p className={`text-xs mt-1 ${total > 100 ? 'text-red-500 font-medium' : total === 100 ? 'text-green-600' : 'text-gray-400'}`}>
      Total: {total}%{total > 100 ? ' ⚠️ ultrapassa 100%' : ''}
    </p>
  )
}

function TableAddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2">
      <Plus className="w-3 h-3" /> Adicionar linha
    </button>
  )
}

function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-red-400 hover:text-red-600 p-1">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}

// ── Página principal ─────────────────────────────────────────
export default function NovaCotacaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { corretora } = useSessao()
  const [etapa, setEtapa] = useState(1)
  const [salvando, setSalvando] = useState(false)
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false)
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  // ── Estado: Etapa 1 — Cadastro ──────────────────────────────
  const [cnpj, setCnpj] = useState('')
  const [clienteId, setClienteId] = useState<string | null>(searchParams.get('cliente_id'))
  const [dadosCadastro, setDadosCadastro] = useState({
    razao_social: '', nome_fantasia: '', atividade_principal: '',
    endereco: '', cep: '', cidade_uf: '', site: '', antt: '',
    contato_nome: '', contato_email: '', contato_telefone: '',
    filial: '', corretor_nome: '',
  })
  const setC = (k: string, v: string) => setDadosCadastro(p => ({ ...p, [k]: v }))

  // ── Estado: Etapa 2 — Ramos ─────────────────────────────────
  const [ramosSel, setRamosSel] = useState<string[]>([])
  const [embTN, setEmbTN] = useState(false)
  const [embExp, setEmbExp] = useState(false)
  const [embImp, setEmbImp] = useState(false)
  const [pctTerrestre, setPctTerrestre] = useState(0)
  const [pctAereo, setPctAereo] = useState(0)
  const [pctAquaviario, setPctAquaviario] = useState(0)
  const [pctFerroviario, setPctFerroviario] = useState(0)
  const [mercadorias, setMercadorias] = useState<LinhaMerc[]>([{ tipo: '', embarcador: '', percentual: 0 }])
  const [percursos, setPercursos] = useState<LinhaPerc[]>([{ origem: '', destino: '', percentual: 0 }])
  // Averbação
  const [avAtm, setAvAtm] = useState(false)
  const [avAverbnet, setAvAverbnet] = useState(false)
  const [avNdd, setAvNdd] = useState(false)
  const [avCitnet, setAvCitnet] = useState(false)
  const [avOutro, setAvOutro] = useState('')
  const [avContatoNome, setAvContatoNome] = useState('')
  const [avContatoEmail, setAvContatoEmail] = useState('')
  const [avContatoTel, setAvContatoTel] = useState('')
  const [avEmailFatura, setAvEmailFatura] = useState('')

  // ── Estado: Etapa 3 — Operação ──────────────────────────────
  const [qtdEmbarques, setQtdEmbarques] = useState('')
  const [vlrMedio, setVlrMedio] = useState('')
  const [vlrMaximo, setVlrMaximo] = useState('')
  const [vlrTotal, setVlrTotal] = useState('')
  const [obsSazonalidade, setObsSazonalidade] = useState('')
  const [detalhesOp, setDetalhesOp] = useState('')
  const [pctFrota, setPctFrota] = useState(0)
  const [pctTransp, setPctTransp] = useState(0)
  const [pctAgregado, setPctAgregado] = useState(0)
  const [pctAutonomo, setPctAutonomo] = useState(0)

  // ── Estado: Etapa 4 — Histórico / Sinistros ─────────────────
  const [expAnterior, setExpAnterior] = useState<LinhaExp[]>([{ seguradora: '', corretor: '', ramo: '', vigencia: '', premio_pago: '' }])
  const [condicaoAtual, setCondicaoAtual] = useState<LinhaCond[]>([{ lmg: '', ramo: '', taxa: '', pos: '', premio_minimo: '' }])
  const [sinPeriodo, setSinPeriodo] = useState('')
  const [sinistros, setSinistros] = useState<LinhaSin[]>([{ data_sinistro: '', ramo: '', local_origem: '', local_destino: '', valor_prejuizo: '' }])
  const [sinDetalhes, setSinDetalhes] = useState('')

  // ── Estado: Etapa 5 — Gerenciamento de Riscos ───────────────
  const [gerenciadoras, setGerenciadoras] = useState<LinhaGerc[]>([
    { gerenciadora: '', possui_cadastro: false, possui_vitimologia: false, possui_monitoramento: false },
  ])
  const [rastrFornecedor, setRastrFornecedor] = useState('')
  const [rastrTipo, setRastrTipo] = useState('')
  const [gerencDetalhes, setGerencDetalhes] = useState('')
  const [ddrs, setDdrs] = useState<LinhaDDR[]>([{ embarcador: '', seguradora: '', lmg: '', vigencia: '' }])

  // ── Estado: Etapa 6 — Condições ─────────────────────────────
  const [condPretendidas, setCondPretendidas] = useState<LinhaCondP[]>([{ lmg: '', ramo: '', taxa: '', pos_franquia: '', premio_minimo: '' }])
  const [condParticulares, setCondParticulares] = useState('')
  const [assLocal, setAssLocal] = useState('')
  const [assData, setAssData] = useState('')

  // ── Busca CNPJ ──────────────────────────────────────────────
  async function handleBuscarCNPJ() {
    if (!validarCNPJ(cnpj)) return
    setBuscandoCNPJ(true)
    setCnpjStatus('idle')
    try {
      // Verifica se cliente já existe
      const clienteExistente = await buscarClientePorCNPJ(corretora!.id, cnpj)
      if (clienteExistente) {
        setClienteId(clienteExistente.id)
        setDadosCadastro({
          razao_social: clienteExistente.razao_social ?? '',
          nome_fantasia: clienteExistente.nome_fantasia ?? '',
          atividade_principal: clienteExistente.atividade_principal ?? '',
          endereco: clienteExistente.endereco ?? '',
          cep: clienteExistente.cep ?? '',
          cidade_uf: clienteExistente.cidade_uf ?? '',
          site: clienteExistente.site ?? '',
          antt: clienteExistente.antt ?? '',
          contato_nome: clienteExistente.contato_nome ?? '',
          contato_email: clienteExistente.contato_email ?? '',
          contato_telefone: clienteExistente.contato_telefone ?? '',
          filial: dadosCadastro.filial,
          corretor_nome: dadosCadastro.corretor_nome,
        })
        setCnpjStatus('ok')
        setBuscandoCNPJ(false)
        return
      }

      // Busca na Receita Federal
      const dados = await buscarDadosCNPJ(cnpj)
      setDadosCadastro(p => ({
        ...p,
        razao_social: dados.razao_social ?? '',
        nome_fantasia: dados.nome_fantasia ?? '',
        atividade_principal: `${dados.cnae_fiscal} – ${dados.cnae_fiscal_descricao}`,
        endereco: [dados.logradouro, dados.numero, dados.complemento, dados.bairro].filter(Boolean).join(', '),
        cep: (dados.cep ?? '').replace(/^(\d{5})(\d{3})$/, '$1-$2'),
        cidade_uf: `${dados.municipio} / ${dados.uf}`,
      }))
      setClienteId(null) // novo cliente, será criado ao salvar
      setCnpjStatus('ok')
    } catch {
      setCnpjStatus('error')
    }
    setBuscandoCNPJ(false)
  }

  function toggleRamo(r: string) {
    setRamosSel(p => {
      const novo = p.includes(r) ? p.filter(x => x !== r) : [...p, r]
      // RCTR-C → preenche 100% terrestre
      if (r === 'RCTR-C' && !p.includes(r)) setPctTerrestre(100)
      if (r === 'RCTR-C' && p.includes(r)) setPctTerrestre(0)
      return novo
    })
  }

  // ── Salvar tudo ─────────────────────────────────────────────
  async function handleSalvar() {
    if (!corretora) return
    setSalvando(true)
    try {
      // 1. Criar ou usar cliente existente
      let cId = clienteId
      if (!cId && dadosCadastro.razao_social) {
        const novoCliente = await criarCliente({
          corretora_id: corretora.id,
          cnpj,
          razao_social: dadosCadastro.razao_social,
          nome_fantasia: dadosCadastro.nome_fantasia || undefined,
          atividade_principal: dadosCadastro.atividade_principal || undefined,
          endereco: dadosCadastro.endereco || undefined,
          cep: dadosCadastro.cep || undefined,
          cidade_uf: dadosCadastro.cidade_uf || undefined,
          site: dadosCadastro.site || undefined,
          antt: dadosCadastro.antt || undefined,
          contato_nome: dadosCadastro.contato_nome || undefined,
          contato_email: dadosCadastro.contato_email || undefined,
          contato_telefone: dadosCadastro.contato_telefone || undefined,
        })
        cId = novoCliente.id
      }

      // 2. Criar cotação principal
      const cotacao = await criarCotacao({
        corretora_id: corretora.id,
        cnpj,
        razao_social: dadosCadastro.razao_social,
        nome_fantasia: dadosCadastro.nome_fantasia || undefined,
        atividade_principal: dadosCadastro.atividade_principal || undefined,
        endereco: dadosCadastro.endereco || undefined,
        cep: dadosCadastro.cep || undefined,
        cidade_uf: dadosCadastro.cidade_uf || undefined,
        site: dadosCadastro.site || undefined,
        antt: dadosCadastro.antt || undefined,
        contato_nome: dadosCadastro.contato_nome || undefined,
        contato_email: dadosCadastro.contato_email || undefined,
        contato_telefone: dadosCadastro.contato_telefone || undefined,
        ramo: (ramosSel[0] as RamoSeguro) ?? 'RCTR-C',
        pct_terrestre: pctTerrestre,
        pct_aereo: pctAereo,
        pct_aquaviario: pctAquaviario,
        pct_ferroviario: pctFerroviario,
        qtd_embarques_mes: qtdEmbarques ? Number(qtdEmbarques) : undefined,
        valor_medio_embarque: vlrMedio ? Number(vlrMedio) : undefined,
        valor_maximo_embarque: vlrMaximo ? Number(vlrMaximo) : undefined,
        importancia_segurada: vlrTotal ? Number(vlrTotal) : undefined,
        obs_sazonalidade: obsSazonalidade || undefined,
        detalhes_operacao: detalhesOp || undefined,
        pct_frota: pctFrota,
        pct_transportadoras: pctTransp,
        pct_agregado: pctAgregado,
        pct_autonomo: pctAutonomo,
      })

      const coid = (cotacao as Record<string, unknown>).id as string

      // 3. Atualizar campos extras (ramos múltiplos, averbação, sinistros, etc.)
      await atualizarCotacao(coid, {
        cliente_id: cId ?? undefined,
        ramos: ramosSel as never,
        embarcador_tn: embTN as never,
        embarcador_exportacao: embExp as never,
        embarcador_importacao: embImp as never,
        averb_atm: avAtm as never,
        averb_averbnet: avAverbnet as never,
        averb_ndd: avNdd as never,
        averb_citnet: avCitnet as never,
        averb_outro: avOutro as never,
        averb_contato_nome: avContatoNome as never,
        averb_contato_email: avContatoEmail as never,
        averb_contato_telefone: avContatoTel as never,
        averb_email_fatura: avEmailFatura as never,
        sinistros_periodo: sinPeriodo as never,
        sinistros_detalhes: sinDetalhes as never,
        condicoes_particulares: condParticulares as never,
        gerenc_rastreador_fornecedor: rastrFornecedor as never,
        gerenc_rastreador_tipo: rastrTipo as never,
        gerenc_detalhes: gerencDetalhes as never,
        assinatura_local: assLocal as never,
        assinatura_data: assData || null as never,
      } as never)

      // 4. Salvar tabelas filhas
      await Promise.all([
        salvarMercadorias(coid, mercadorias.filter(m => m.tipo)),
        salvarPercursos(coid, percursos.filter(p => p.origem && p.destino)),
        salvarTabelaFilha('cotacao_experiencia_anterior', coid,
          expAnterior.filter(e => e.seguradora).map(e => ({ ...e, premio_pago: e.premio_pago ? Number(e.premio_pago) : null }))),
        salvarTabelaFilha('cotacao_condicao_atual', coid,
          condicaoAtual.filter(c => c.lmg || c.ramo).map(c => ({ ...c, premio_minimo: c.premio_minimo ? Number(c.premio_minimo) : null }))),
        salvarTabelaFilha('cotacao_sinistros', coid,
          sinistros.filter(s => s.data_sinistro || s.ramo).map(s => ({ ...s, valor_prejuizo: s.valor_prejuizo ? Number(s.valor_prejuizo) : null, local_origem: s.local_origem, local_destino: s.local_destino }))),
        salvarTabelaFilha('cotacao_ddrs', coid, ddrs.filter(d => d.embarcador || d.seguradora)),
        salvarTabelaFilha('cotacao_gerenciadoras', coid, gerenciadoras.filter(g => g.gerenciadora)),
        salvarTabelaFilha('cotacao_condicoes_pretendidas', coid,
          condPretendidas.filter(c => c.lmg || c.ramo).map(c => ({ ...c, premio_minimo: c.premio_minimo ? Number(c.premio_minimo) : null }))),
      ])

      router.push(`/cotacoes/${coid}`)
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar. Verifique os dados e tente novamente.')
    }
    setSalvando(false)
  }

  // ── Navegação ────────────────────────────────────────────────
  const Nav = ({ back, next, isLast }: { back?: () => void; next?: () => void; isLast?: boolean }) => (
    <div className="flex justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
      <button type="button" onClick={back ?? (() => setEtapa(e => e - 1))} disabled={etapa === 1}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      {!isLast ? (
        <button type="button" onClick={next ?? (() => setEtapa(e => e + 1))}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800">
          Continuar <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <button type="button" onClick={handleSalvar} disabled={salvando}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-600 disabled:opacity-50">
          {salvando ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Check className="w-4 h-4" /> Salvar cotação</>}
        </button>
      )}
    </div>
  )

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Nova cotação</h1>
      </div>

      <StepHeader etapa={etapa} total={ETAPAS.length} />

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">

        {/* ══════════ ETAPA 1 — CADASTRO ══════════ */}
        {etapa === 1 && (
          <div className="space-y-4">
            <div>
              <Label>CNPJ</Label>
              <div className="flex gap-2">
                <input
                  value={cnpj}
                  onChange={e => setCnpj(formatCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={handleBuscarCNPJ} disabled={buscandoCNPJ || !validarCNPJ(cnpj)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50">
                  {buscandoCNPJ ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {buscandoCNPJ ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              {cnpjStatus === 'ok' && <p className="text-xs text-green-600 mt-1">{clienteId ? '✓ Cliente encontrado na base' : '✓ Dados preenchidos pela Receita Federal — cliente será cadastrado automaticamente'}</p>}
              {cnpjStatus === 'error' && <p className="text-xs text-red-500 mt-1">✗ CNPJ não encontrado</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Razão social</Label>
                <Input value={dadosCadastro.razao_social} onChange={v => setC('razao_social', v)} />
              </div>
              <div>
                <Label>Nome fantasia</Label>
                <Input value={dadosCadastro.nome_fantasia} onChange={v => setC('nome_fantasia', v)} />
              </div>
              <div>
                <Label>Atividade principal</Label>
                <Input value={dadosCadastro.atividade_principal} onChange={v => setC('atividade_principal', v)} />
              </div>
              <div className="col-span-2">
                <Label>Endereço</Label>
                <Input value={dadosCadastro.endereco} onChange={v => setC('endereco', v)} />
              </div>
              <div>
                <Label>CEP</Label>
                <Input value={dadosCadastro.cep} onChange={v => setC('cep', v)} />
              </div>
              <div>
                <Label>Cidade / UF</Label>
                <Input value={dadosCadastro.cidade_uf} onChange={v => setC('cidade_uf', v)} />
              </div>
              <div>
                <Label>Site</Label>
                <Input value={dadosCadastro.site} onChange={v => setC('site', v)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>ANTT / RNTRC</Label>
                  <button
                    type="button"
                    onClick={() => {
                      const digits = cnpj.replace(/\D/g, '')
                      const url = digits
                        ? `https://consultapublica.antt.gov.br/Site/ConsultaRNTRC.aspx?documento=${digits}`
                        : 'https://consultapublica.antt.gov.br/Site/ConsultaRNTRC.aspx'
                      window.open(url, '_blank', 'noopener,noreferrer')
                    }}
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Consultar no site da ANTT
                  </button>
                </div>
                <Input value={dadosCadastro.antt} onChange={v => setC('antt', v)} placeholder="Nº RNTRC" />
              </div>
              <div>
                <Label>Contato</Label>
                <Input value={dadosCadastro.contato_nome} onChange={v => setC('contato_nome', v)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={dadosCadastro.contato_telefone} onChange={v => setC('contato_telefone', v)} />
              </div>
              <div className="col-span-2">
                <Label>E-mail</Label>
                <Input value={dadosCadastro.contato_email} onChange={v => setC('contato_email', v)} type="email" />
              </div>
            </div>
            <Nav next={() => { if (!dadosCadastro.razao_social) { alert('Preencha a Razão Social.'); return } setEtapa(2) }} />
          </div>
        )}

        {/* ══════════ ETAPA 2 — RAMOS ══════════ */}
        {etapa === 2 && (
          <div className="space-y-5">
            {/* Ramos transportadores */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Transportadores</p>
              <div className="flex flex-wrap gap-2">
                {RAMOS.map(r => (
                  <button key={r} type="button" onClick={() => toggleRamo(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                      ${ramosSel.includes(r)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}>
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Obs: com exceção RC-DC, caso tenha mais de 1 ramo, deverá ser preenchido 1 questionário por ramo.</p>
            </div>

            {/* Embarcador */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Embarcador</p>
              <div className="flex gap-4">
                {[['TN', embTN, setEmbTN], ['Exportação', embExp, setEmbExp], ['Importação', embImp, setEmbImp]].map(([label, val, set]) => (
                  <label key={label as string} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={val as boolean} onChange={e => (set as (v: boolean) => void)(e.target.checked)}
                      className="w-4 h-4 rounded" />
                    {label as string}
                  </label>
                ))}
              </div>
            </div>

            {/* Tipos de transporte */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tipos de transporte (%)</p>
              <div className="grid grid-cols-2 gap-3">
                {[['Terrestre', pctTerrestre, setPctTerrestre], ['Aéreo', pctAereo, setPctAereo],
                  ['Aquaviário (Fluvial, Marítimo)', pctAquaviario, setPctAquaviario], ['Ferroviário', pctFerroviario, setPctFerroviario]].map(([lbl, val, set]) => (
                  <div key={lbl as string} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-36 flex-shrink-0">{lbl as string}</span>
                    <input type="number" min={0} max={100} value={val as number}
                      onChange={e => (set as (v: number) => void)(Number(e.target.value))}
                      className="w-20 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-right text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-sm text-gray-400">%</span>
                  </div>
                ))}
              </div>
              <PctTotal campos={[pctTerrestre, pctAereo, pctAquaviario, pctFerroviario]} />
            </div>

            {/* Mercadorias */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Mercadorias</p>
              <div className="space-y-2">
                {mercadorias.map((m, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={m.tipo} onChange={e => setMercadorias(p => p.map((x, j) => j === i ? { ...x, tipo: e.target.value } : x))}
                      placeholder="Tipo de mercadoria" className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none" />
                    <input value={m.embarcador} onChange={e => setMercadorias(p => p.map((x, j) => j === i ? { ...x, embarcador: e.target.value } : x))}
                      placeholder="Embarcador" className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none" />
                    <input type="number" value={m.percentual} onChange={e => setMercadorias(p => p.map((x, j) => j === i ? { ...x, percentual: Number(e.target.value) } : x))}
                      placeholder="%" className="w-16 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-right text-gray-900 dark:text-white focus:outline-none" />
                    <DelBtn onClick={() => setMercadorias(p => p.filter((_, j) => j !== i))} />
                  </div>
                ))}
                <TableAddBtn onClick={() => setMercadorias(p => [...p, { tipo: '', embarcador: '', percentual: 0 }])} />
              </div>
            </div>

            {/* Percursos */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Percursos</p>
              <div className="space-y-2">
                {percursos.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={p.origem} onChange={e => setPercursos(prev => prev.map((x, j) => j === i ? { ...x, origem: e.target.value } : x))}
                      placeholder="Origem (UF/Cidade)" className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none" />
                    <input value={p.destino} onChange={e => setPercursos(prev => prev.map((x, j) => j === i ? { ...x, destino: e.target.value } : x))}
                      placeholder="Destino (UF/Cidade)" className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none" />
                    <input type="number" value={p.percentual} onChange={e => setPercursos(prev => prev.map((x, j) => j === i ? { ...x, percentual: Number(e.target.value) } : x))}
                      placeholder="%" className="w-16 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-right text-gray-900 dark:text-white focus:outline-none" />
                    <DelBtn onClick={() => setPercursos(prev => prev.filter((_, j) => j !== i))} />
                  </div>
                ))}
                <TableAddBtn onClick={() => setPercursos(p => [...p, { origem: '', destino: '', percentual: 0 }])} />
                <PctTotal campos={percursos.map(p => p.percentual)} />
              </div>
            </div>

            {/* Averbação */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Dados da averbação</p>
              <div className="flex flex-wrap gap-4 mb-3">
                {[['AT&M', avAtm, setAvAtm], ['Averbnet', avAverbnet, setAvAverbnet], ['NDD', avNdd, setAvNdd], ['Citnet', avCitnet, setAvCitnet]].map(([lbl, val, set]) => (
                  <label key={lbl as string} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={val as boolean} onChange={e => (set as (v: boolean) => void)(e.target.checked)} className="w-4 h-4 rounded" />
                    {lbl as string}
                  </label>
                ))}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!avOutro} onChange={e => !e.target.checked && setAvOutro('')} className="w-4 h-4 rounded" />
                    Outro:
                  </label>
                  <input value={avOutro} onChange={e => setAvOutro(e.target.value)} placeholder="Especificar"
                    className="w-28 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Contato — Nome</Label><Input value={avContatoNome} onChange={setAvContatoNome} /></div>
                <div><Label>E-mail</Label><Input value={avContatoEmail} onChange={setAvContatoEmail} type="email" /></div>
                <div><Label>Telefone</Label><Input value={avContatoTel} onChange={setAvContatoTel} /></div>
                <div className="col-span-3"><Label>E-mail para envio da fatura</Label><Input value={avEmailFatura} onChange={setAvEmailFatura} type="email" /></div>
              </div>
            </div>

            <Nav />
          </div>
        )}

        {/* ══════════ ETAPA 3 — OPERAÇÃO ══════════ */}
        {etapa === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Operação — Quantidade de viagens e valores/mês</p>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Quantidade de embarques</Label><Input value={qtdEmbarques} onChange={setQtdEmbarques} type="number" placeholder="0" /></div>
                <div><Label>Valor médio por embarque (R$)</Label><Input value={vlrMedio} onChange={setVlrMedio} type="number" placeholder="0,00" /></div>
                <div><Label>Valor máximo por embarque (R$)</Label><Input value={vlrMaximo} onChange={setVlrMaximo} type="number" placeholder="0,00" /></div>
                <div><Label>Importância segurada total (R$)</Label><Input value={vlrTotal} onChange={setVlrTotal} type="number" placeholder="0,00" /></div>
                <div className="col-span-2"><Label>Obs. sazonalidade / safra</Label><Textarea value={obsSazonalidade} onChange={setObsSazonalidade} rows={2} /></div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Detalhes da operação</p>
              <Textarea value={detalhesOp} onChange={setDetalhesOp} rows={4} placeholder="Descrever detalhes da operação..." />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Motoristas (%)</p>
              <div className="grid grid-cols-2 gap-3">
                {[['Frota', pctFrota, setPctFrota], ['Transportadoras (sub-contratadas)', pctTransp, setPctTransp],
                  ['Agregado', pctAgregado, setPctAgregado], ['Autônomo', pctAutonomo, setPctAutonomo]].map(([lbl, val, set]) => (
                  <div key={lbl as string} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-52 flex-shrink-0">{lbl as string}</span>
                    <input type="number" min={0} max={100} value={val as number}
                      onChange={e => (set as (v: number) => void)(Number(e.target.value))}
                      className="w-20 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-right text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-sm text-gray-400">%</span>
                  </div>
                ))}
              </div>
              <PctTotal campos={[pctFrota, pctTransp, pctAgregado, pctAutonomo]} />
            </div>
            <Nav />
          </div>
        )}

        {/* ══════════ ETAPA 4 — HISTÓRICO / SINISTROS ══════════ */}
        {etapa === 4 && (
          <div className="space-y-6">
            {/* Experiência anterior */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Experiência anterior</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                    {['Seguradora','Corretor','Ramo','Vigência','Prêmio Pago',''].map(h => <th key={h} className="text-left py-1.5 px-2 text-gray-500 font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {expAnterior.map((e, i) => (
                      <tr key={i}>
                        {(['seguradora','corretor','ramo','vigencia','premio_pago'] as const).map(k => (
                          <td key={k} className="py-1 px-1">
                            <input value={e[k]} onChange={ev => setExpAnterior(p => p.map((x, j) => j === i ? { ...x, [k]: ev.target.value } : x))}
                              className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none" />
                          </td>
                        ))}
                        <td><DelBtn onClick={() => setExpAnterior(p => p.filter((_, j) => j !== i))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TableAddBtn onClick={() => setExpAnterior(p => [...p, { seguradora: '', corretor: '', ramo: '', vigencia: '', premio_pago: '' }])} />
              </div>
            </div>

            {/* Condição atual */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Condição atual</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                    {['LMG','Ramo','Taxa','P.O.S.','Prêmio Mínimo',''].map(h => <th key={h} className="text-left py-1.5 px-2 text-gray-500 font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {condicaoAtual.map((c, i) => (
                      <tr key={i}>
                        {(['lmg','ramo','taxa','pos','premio_minimo'] as const).map(k => (
                          <td key={k} className="py-1 px-1">
                            <input value={c[k]} onChange={ev => setCondicaoAtual(p => p.map((x, j) => j === i ? { ...x, [k]: ev.target.value } : x))}
                              className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none" />
                          </td>
                        ))}
                        <td><DelBtn onClick={() => setCondicaoAtual(p => p.filter((_, j) => j !== i))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TableAddBtn onClick={() => setCondicaoAtual(p => [...p, { lmg: '', ramo: '', taxa: '', pos: '', premio_minimo: '' }])} />
              </div>
            </div>

            {/* Sinistros */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Sinistros</p>
              <div className="flex gap-4 mb-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Experiência:</span>
                {[['12', '12 meses'], ['24', '24 meses'], ['36', '36 meses'], ['nao_houve', 'Não houve']].map(([val, lbl]) => (
                  <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={sinPeriodo === val} onChange={() => setSinPeriodo(p => p === val ? '' : val)}
                      className="w-4 h-4 rounded" />
                    {lbl}
                  </label>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                    {['Data','Ramo','Local Origem','Local Destino','Valor Prejuízo',''].map(h => <th key={h} className="text-left py-1.5 px-2 text-gray-500 font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {sinistros.map((s, i) => (
                      <tr key={i}>
                        {(['data_sinistro','ramo','local_origem','local_destino','valor_prejuizo'] as const).map(k => (
                          <td key={k} className="py-1 px-1">
                            <input value={s[k]} onChange={ev => setSinistros(p => p.map((x, j) => j === i ? { ...x, [k]: ev.target.value } : x))}
                              placeholder={k === 'data_sinistro' ? 'DD/MM/AAAA' : ''}
                              className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none" />
                          </td>
                        ))}
                        <td><DelBtn onClick={() => setSinistros(p => p.filter((_, j) => j !== i))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TableAddBtn onClick={() => setSinistros(p => [...p, { data_sinistro: '', ramo: '', local_origem: '', local_destino: '', valor_prejuizo: '' }])} />
              </div>
              <div className="mt-3">
                <Label>Detalhes dos sinistros</Label>
                <Textarea value={sinDetalhes} onChange={setSinDetalhes} rows={3} placeholder="Descrever detalhes dos sinistros..." />
              </div>
            </div>
            <Nav />
          </div>
        )}

        {/* ══════════ ETAPA 5 — GERENCIAMENTO DE RISCOS ══════════ */}
        {etapa === 5 && (
          <div className="space-y-6">
            {/* DDRs */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">DDRs</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                    {['Embarcador','Seguradora','LMG','Vigência',''].map(h => <th key={h} className="text-left py-1.5 px-2 text-gray-500 font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {ddrs.map((d, i) => (
                      <tr key={i}>
                        {(['embarcador','seguradora','lmg','vigencia'] as const).map(k => (
                          <td key={k} className="py-1 px-1">
                            <input value={d[k]} onChange={ev => setDdrs(p => p.map((x, j) => j === i ? { ...x, [k]: ev.target.value } : x))}
                              className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none" />
                          </td>
                        ))}
                        <td><DelBtn onClick={() => setDdrs(p => p.filter((_, j) => j !== i))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TableAddBtn onClick={() => setDdrs(p => [...p, { embarcador: '', seguradora: '', lmg: '', vigencia: '' }])} />
              </div>
            </div>

            {/* Gerenciadoras */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Gerenciamento de riscos</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Gerenciadora</th>
                    <th className="text-center py-1.5 px-2 text-gray-500 font-medium">Cadastro</th>
                    <th className="text-center py-1.5 px-2 text-gray-500 font-medium">Vitimologia</th>
                    <th className="text-center py-1.5 px-2 text-gray-500 font-medium">Monitoramento</th>
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {gerenciadoras.map((g, i) => (
                      <tr key={i}>
                        <td className="py-1 px-1">
                          <input value={g.gerenciadora} onChange={e => setGerenciadoras(p => p.map((x, j) => j === i ? { ...x, gerenciadora: e.target.value } : x))}
                            placeholder="Nome da gerenciadora"
                            className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none" />
                        </td>
                        {(['possui_cadastro','possui_vitimologia','possui_monitoramento'] as const).map(k => (
                          <td key={k} className="text-center py-1">
                            <input type="checkbox" checked={g[k]} onChange={e => setGerenciadoras(p => p.map((x, j) => j === i ? { ...x, [k]: e.target.checked } : x))} className="w-4 h-4" />
                          </td>
                        ))}
                        <td><DelBtn onClick={() => setGerenciadoras(p => p.filter((_, j) => j !== i))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TableAddBtn onClick={() => setGerenciadoras(p => [...p, { gerenciadora: '', possui_cadastro: false, possui_vitimologia: false, possui_monitoramento: false }])} />
              </div>
            </div>

            {/* Rastreador */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Rastreador</p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label>Fornecedor</Label>
                  <input value={rastrFornecedor} onChange={e => setRastrFornecedor(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none w-36" />
                </div>
                {[['gsm_gprs','GSM/GPRS'], ['hibrido','Híbrido'], ['rf_fixo_isca','RF Fixo / Isca']].map(([val, lbl]) => (
                  <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={rastrTipo === val} onChange={() => setRastrTipo(p => p === val ? '' : val)} className="w-4 h-4 rounded" />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Detalhes do gerenciamento de riscos</Label>
              <Textarea value={gerencDetalhes} onChange={setGerencDetalhes} rows={3} placeholder="Descrever detalhes..." />
            </div>
            <Nav />
          </div>
        )}

        {/* ══════════ ETAPA 6 — CONDIÇÕES ══════════ */}
        {etapa === 6 && (
          <div className="space-y-6">
            {/* Condições pretendidas */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Condições pretendidas</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                    {['LMG','Ramo','Taxa','P.O.S. (Franquia)','Prêmio Mínimo',''].map(h => <th key={h} className="text-left py-1.5 px-2 text-gray-500 font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {condPretendidas.map((c, i) => (
                      <tr key={i}>
                        {(['lmg','ramo','taxa','pos_franquia','premio_minimo'] as const).map(k => (
                          <td key={k} className="py-1 px-1">
                            <input value={c[k]} onChange={ev => setCondPretendidas(p => p.map((x, j) => j === i ? { ...x, [k]: ev.target.value } : x))}
                              className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none" />
                          </td>
                        ))}
                        <td><DelBtn onClick={() => setCondPretendidas(p => p.filter((_, j) => j !== i))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TableAddBtn onClick={() => setCondPretendidas(p => [...p, { lmg: '', ramo: '', taxa: '', pos_franquia: '', premio_minimo: '' }])} />
              </div>
            </div>

            {/* Condições particulares */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Condições particulares</p>
              <Textarea value={condParticulares} onChange={setCondParticulares} rows={5} placeholder="Descrever condições particulares..." />
            </div>

            {/* Declaração */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Declaração</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Declaro que as informações aqui presentes são verídicas e autorizo as seguradoras a realizar quaisquer pesquisas que julgarem necessárias para a apuração dos dados contidos neste questionário. Nesta forma estou ciente que a simples apresentação deste questionário junto às seguradoras do mercado não representa nenhum compromisso de nenhuma delas de aceitar o risco proposto.
              </p>
            </div>

            {/* Assinatura */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Local da assinatura</Label>
                <Input value={assLocal} onChange={setAssLocal} placeholder="Cidade" />
              </div>
              <div>
                <Label>Data da assinatura</Label>
                <Input value={assData} onChange={setAssData} type="date" />
              </div>
            </div>

            <Nav isLast />
          </div>
        )}
      </div>
    </div>
  )
}
