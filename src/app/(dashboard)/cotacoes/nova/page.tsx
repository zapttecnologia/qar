'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { useSessao } from '@/hooks/useSessao'
import { useCotacoes } from '@/hooks/useCotacoes'
import { criarCotacao, atualizarCotacao } from '@/lib/queries/cotacoes'
import { salvarMercadorias, salvarPercursos } from '@/lib/queries/cotacoes'
import { salvarTabelaFilha, buscarTabelasFilhas } from '@/lib/queries/cotacoes_qar'
import { buscarClientePorCNPJ, criarCliente } from '@/lib/queries/clientes'
import { buscarDadosCNPJ, formatCNPJ, validarCNPJ } from '@/lib/utils'
import { buscarCotacao } from '@/lib/queries/cotacoes'
import { useANTT } from '@/hooks/useANTT'
import { BadgeANTT } from '@/components/antt/BadgeANTT'
import { InputMercadoria } from '@/components/cotacoes/InputMercadoria'
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

const RAMOS: RamoSeguro[] = ['RCTR-C', 'RC-DC', 'RC-V', 'RCTA-C', 'RCT-OM', 'RCTR-VI', 'RCA-C']

// Seleção automática de ramos pela atividade principal (CNAE)
const PERFIS_ATIVIDADE = [
  {
    cnaes: ['4930201', '4930202', '4930203', '4930204'],
    ramos: ['RCTR-C', 'RC-DC', 'RC-V'] as RamoSeguro[],
    rotulo: 'Transportadora rodoviária',
    modal: 'terrestre' as const,
  },
  {
    // 5120-0/00 carga · 5111-1/00 e 5112-9/xx passageiros (transportam carga em porão)
    cnaes: ['5120000', '5111100', '5112901', '5112999'],
    ramos: ['RCA-C', 'RCTA-C', 'RCTR-VI'] as RamoSeguro[],
    rotulo: 'Transportadora aérea',
    modal: 'aereo' as const,
  },
  {
    // 4911-6/00 Transporte ferroviário de carga
    cnaes: ['4911600'],
    ramos: ['RCT-OM'] as RamoSeguro[],
    rotulo: 'Transportadora ferroviária',
    modal: 'ferroviario' as const,
  },
  {
    // 5011-4/02 cabotagem · 5012-2/02 longo curso · 5021-1/02 e 5022-0/02 navegação interior — todos carga
    cnaes: ['5011402', '5012202', '5021102', '5022002'],
    ramos: ['RCA-C'] as RamoSeguro[],
    rotulo: 'Transportadora aquaviária',
    modal: 'aquaviario' as const,
  },
]

function perfilPorAtividade(atividade: string) {
  const cnae = (atividade ?? '').replace(/\D/g, '').slice(0, 7)
  return PERFIS_ATIVIDADE.find(p => p.cnaes.includes(cnae)) ?? null
}

// Os inputs do formulário são todos de texto; o banco devolve string | number | null.
const txt = (v: unknown) => (v === null || v === undefined ? '' : String(v))

function listar(ramos: string[]) {
  return ramos.join(', ').replace(/, ([^,]*)$/, ' e $1')
}
const ETAPAS = ['Cadastro', 'Ramos', 'Operação', 'Histórico', 'Riscos', 'Condições']

// ── Componentes de apoio ─────────────────────────────────────
function StepHeader({ etapa, total }: { etapa: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, overflowX: 'auto', flexWrap: 'nowrap' }}>
      {ETAPAS.map((e, i) => {
        const n = i + 1
        const done = etapa > n
        const active = etapa === n
        return (
          <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                background: active ? 'var(--accent)' : done ? '#059669' : 'var(--bg-page)',
                color: active || done ? '#fff' : 'var(--text-3)',
                border: active || done ? 'none' : '1px solid var(--border-color)',
              }}>
                {done ? <i className="ti ti-check" style={{ fontSize: 11 }} /> : n}
              </div>
              <span style={{
                fontSize: 12, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap',
                color: active ? 'var(--text-1)' : done ? '#059669' : 'var(--text-3)',
              }}>{e}</span>
            </div>
            {i < total - 1 && <div style={{ width: 20, height: 1, background: 'var(--border-color)' }} />}
          </div>
        )
      })}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="field-label">{children}</label>
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} className="field-input" style={{ fontSize: 13 }} />
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
      className="field-input" style={{ resize: "none", fontSize: 13 }}
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
      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", marginTop: 8 }}>
      <i className="ti ti-plus" style={{ fontSize: 13 }} /> Adicionar linha
    </button>
  )
}

function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4 }}>
      <i className="ti ti-trash" style={{ fontSize: 15 }} />
    </button>
  )
}

// ── Página principal ─────────────────────────────────────────
export default function NovaCotacaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { corretora } = useSessao()
  const cota = useCotacoes()
  const antt = useANTT()
  const [etapa, setEtapa] = useState(1)
  const [salvando, setSalvando] = useState(false)
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false)
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  const editarId = searchParams.get('editar')
  const modoEdicao = !!editarId

  // ── Autosave ────────────────────────────────────────────────
  // Id da cotação persistida. Em criação começa nulo e é preenchido no 1º salvamento.
  const cotacaoIdRef = useRef<string | null>(editarId)
  // Idem para o cliente: sem isso cada autosave criaria um cliente duplicado,
  // porque persistir() cria um novo sempre que clienteId está nulo.
  const clienteIdRef = useRef<string | null>(null)
  // Em edição só liberamos o autosave depois que os dados terminaram de carregar,
  // senão o formulário ainda vazio sobrescreveria a cotação existente.
  const [pronto, setPronto] = useState(!editarId)
  const [autoStatus, setAutoStatus] = useState<'idle' | 'salvando' | 'salvo' | 'erro'>('idle')
  const [salvoEm, setSalvoEm] = useState<string | null>(null)
  const ultimoSalvoRef = useRef<string | null>(null)
  const emVooRef = useRef(false)
  // Última versão gravada de cada tabela filha. Como salvá-las faz delete + insert
  // na tabela inteira, só reescrevemos as seções que realmente mudaram.
  const filhasRef = useRef<Record<string, string>>({})

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
  const [avNdd, setAvNdd] = useState(false)
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

  // ── Carrega dados ao editar cotação existente ────────────────
  useEffect(() => {
    if (!editarId) return
    const pCotacao = buscarCotacao(editarId).then(cotacao => {
      if (!cotacao) return
      const c = cotacao as Record<string, unknown>
      setCnpj(formatCNPJ((c.cnpj as string) ?? ''))
      setDadosCadastro({
        razao_social: (c.razao_social as string) ?? '',
        nome_fantasia: (c.nome_fantasia as string) ?? '',
        atividade_principal: (c.atividade_principal as string) ?? '',
        endereco: (c.endereco as string) ?? '',
        cep: (c.cep as string) ?? '',
        cidade_uf: (c.cidade_uf as string) ?? '',
        site: (c.site as string) ?? '',
        antt: (c.antt as string) ?? '',
        contato_nome: (c.contato_nome as string) ?? '',
        contato_email: (c.contato_email as string) ?? '',
        contato_telefone: (c.contato_telefone as string) ?? '',
        filial: (c.filial as string) ?? '',
        corretor_nome: (c.corretor_nome as string) ?? '',
      })
      setClienteId((c.cliente_id as string) ?? null)
      setCnpjStatus('ok')
      // Ramos múltiplos: a coluna `ramos` é a fonte de verdade;
      // `ramo` (singular) é só o principal, usado como fallback em cotações antigas.
      const ramos = Array.isArray(c.ramos) ? (c.ramos as string[]).filter(Boolean) : []
      setRamosSel(ramos.length ? ramos : c.ramo ? [c.ramo as string] : [])
      setEmbTN(!!(c.embarcador_tn))
      setEmbExp(!!(c.embarcador_exportacao))
      setEmbImp(!!(c.embarcador_importacao))
      setPctTerrestre(Number(c.pct_terrestre ?? 0))
      setPctAereo(Number(c.pct_aereo ?? 0))
      setPctAquaviario(Number(c.pct_aquaviario ?? 0))
      setPctFerroviario(Number(c.pct_ferroviario ?? 0))

      // Averbação
      setAvAtm(!!(c.averb_atm))
      setAvNdd(!!(c.averb_ndd))
      setAvOutro(txt(c.averb_outro))
      setAvContatoNome(txt(c.averb_contato_nome))
      setAvContatoEmail(txt(c.averb_contato_email))
      setAvContatoTel(txt(c.averb_contato_telefone))
      setAvEmailFatura(txt(c.averb_email_fatura))

      // Operação
      setQtdEmbarques(txt(c.qtd_embarques_mes))
      setVlrMedio(txt(c.valor_medio_embarque))
      setVlrMaximo(txt(c.valor_maximo_embarque))
      setVlrTotal(txt(c.importancia_segurada))
      setObsSazonalidade(txt(c.obs_sazonalidade))
      setDetalhesOp(txt(c.detalhes_operacao))
      setPctFrota(Number(c.pct_frota ?? 0))
      setPctTransp(Number(c.pct_transportadoras ?? 0))
      setPctAgregado(Number(c.pct_agregado ?? 0))
      setPctAutonomo(Number(c.pct_autonomo ?? 0))

      // Histórico
      setSinPeriodo(txt(c.sinistros_periodo))
      setSinDetalhes(txt(c.sinistros_detalhes))

      // Gerenciamento de riscos
      setRastrFornecedor(txt(c.gerenc_rastreador_fornecedor))
      setRastrTipo(txt(c.gerenc_rastreador_tipo))
      setGerencDetalhes(txt(c.gerenc_detalhes))

      // Condições
      setCondParticulares(txt(c.condicoes_particulares))
      setAssLocal(txt(c.assinatura_local))
      setAssData(txt(c.assinatura_data).slice(0, 10))
    })

    // Tabelas filhas — sem isso, salvar uma edição apagaria todas elas
    const pFilhas = buscarTabelasFilhas(editarId).then(f => {
      if (f.mercadorias.length) setMercadorias(f.mercadorias.map(r => {
        const m = r as Record<string, unknown>
        return { tipo: txt(m.tipo), embarcador: txt(m.embarcador), percentual: Number(m.percentual ?? 0) }
      }))
      if (f.percursos.length) setPercursos(f.percursos.map(r => {
        const p = r as Record<string, unknown>
        return { origem: txt(p.origem), destino: txt(p.destino), percentual: Number(p.percentual ?? 0) }
      }))
      if (f.experiencia.length) setExpAnterior(f.experiencia.map(r => {
        const e = r as Record<string, unknown>
        return { seguradora: txt(e.seguradora), corretor: txt(e.corretor), ramo: txt(e.ramo), vigencia: txt(e.vigencia), premio_pago: txt(e.premio_pago) }
      }))
      if (f.condicaoAtual.length) setCondicaoAtual(f.condicaoAtual.map(r => {
        const c2 = r as Record<string, unknown>
        return { lmg: txt(c2.lmg), ramo: txt(c2.ramo), taxa: txt(c2.taxa), pos: txt(c2.pos), premio_minimo: txt(c2.premio_minimo) }
      }))
      if (f.sinistros.length) setSinistros(f.sinistros.map(r => {
        const s = r as Record<string, unknown>
        return { data_sinistro: txt(s.data_sinistro).slice(0, 10), ramo: txt(s.ramo), local_origem: txt(s.local_origem), local_destino: txt(s.local_destino), valor_prejuizo: txt(s.valor_prejuizo) }
      }))
      if (f.ddrs.length) setDdrs(f.ddrs.map(r => {
        const d = r as Record<string, unknown>
        return { embarcador: txt(d.embarcador), seguradora: txt(d.seguradora), lmg: txt(d.lmg), vigencia: txt(d.vigencia) }
      }))
      if (f.gerenciadoras.length) setGerenciadoras(f.gerenciadoras.map(r => {
        const g = r as Record<string, unknown>
        return { gerenciadora: txt(g.gerenciadora), possui_cadastro: !!g.possui_cadastro, possui_vitimologia: !!g.possui_vitimologia, possui_monitoramento: !!g.possui_monitoramento }
      }))
      if (f.condPretendidas.length) setCondPretendidas(f.condPretendidas.map(r => {
        const c3 = r as Record<string, unknown>
        return { lmg: txt(c3.lmg), ramo: txt(c3.ramo), taxa: txt(c3.taxa), pos_franquia: txt(c3.pos_franquia), premio_minimo: txt(c3.premio_minimo) }
      }))
    })

    // Só libera o autosave depois que as duas leituras terminarem
    Promise.all([pCotacao, pFilhas]).catch(console.error).finally(() => setPronto(true))
  }, [editarId])

  // ── Autosave ────────────────────────────────────────────────
  // O snapshot é gatilho e detector de mudança ao mesmo tempo: se nada mudou
  // desde a última gravação, nenhuma escrita chega ao banco. clienteId fica de
  // fora por ser estado interno, não algo que o usuário preencheu.
  const snapshot = JSON.stringify({
    cnpj, dadosCadastro, ramosSel, embTN, embExp, embImp,
    pctTerrestre, pctAereo, pctAquaviario, pctFerroviario, mercadorias, percursos,
    avAtm, avNdd, avOutro, avContatoNome, avContatoEmail, avContatoTel, avEmailFatura,
    qtdEmbarques, vlrMedio, vlrMaximo, vlrTotal, obsSazonalidade, detalhesOp,
    pctFrota, pctTransp, pctAgregado, pctAutonomo,
    expAnterior, condicaoAtual, sinPeriodo, sinistros, sinDetalhes,
    gerenciadoras, rastrFornecedor, rastrTipo, gerencDetalhes, ddrs,
    condPretendidas, condParticulares, assLocal, assData,
  })
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot

  useEffect(() => {
    if (!pronto || !corretora) return
    // Sem razão social não há cotação que faça sentido criar
    if (!dadosCadastro.razao_social.trim()) return
    // Primeira passagem apenas registra a base de comparação
    if (ultimoSalvoRef.current === null) { ultimoSalvoRef.current = snapshot; return }
    if (ultimoSalvoRef.current === snapshot) return

    const timer = setTimeout(async () => {
      if (emVooRef.current) return
      emVooRef.current = true
      setAutoStatus('salvando')
      try {
        // O usuário pode seguir digitando durante a gravação; o laço garante
        // que a versão mais recente também seja persistida.
        while (snapshotRef.current !== ultimoSalvoRef.current) {
          const alvo = snapshotRef.current
          await persistir(false)
          ultimoSalvoRef.current = alvo
        }
        setSalvoEm(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
        setAutoStatus('salvo')
      } catch {
        setAutoStatus('erro')
      }
      emVooRef.current = false
    }, 2000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, pronto, corretora])

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
        // Consulta ANTT mesmo para clientes existentes (status pode ter mudado)
        antt.consultar(cnpj)
        // Seleção automática de ramos por CNAE do cliente existente
        aplicarPerfilAtividade(clienteExistente.atividade_principal ?? '')
        return
      }

      // 1. Receita Federal — BrasilAPI (gratuita, dados completos)
      try {
        const dados = await buscarDadosCNPJ(cnpj)
        const atividadeTexto = `${dados.cnae_fiscal} – ${dados.cnae_fiscal_descricao}`
        setDadosCadastro(p => ({
          ...p,
          razao_social: dados.razao_social ?? '',
          nome_fantasia: dados.nome_fantasia ?? '',
          atividade_principal: atividadeTexto,
          endereco: [dados.logradouro, dados.numero, dados.complemento, dados.bairro].filter(Boolean).join(', '),
          cep: (dados.cep ?? '').replace(/^(\d{5})(\d{3})$/, '$1-$2'),
          cidade_uf: `${dados.municipio} / ${dados.uf}`,
        }))
        // Seleção automática de ramos por CNAE
        aplicarPerfilAtividade(atividadeTexto)
      } catch { /* ignora */ }

      // 2. ANTT — OpenCheck (pago, só RNTRC e status)
      antt.consultar(cnpj).then(r => {
        if (r?.rntrc) setDadosCadastro(p => ({ ...p, antt: r.rntrc ?? p.antt }))
      })

      setClienteId(null)
      setCnpjStatus('ok')
    } catch {
      setCnpjStatus('error')
    }
    setBuscandoCNPJ(false)
  }

  // Seleciona os ramos e o modal correspondentes à atividade principal.
  // mesclar = mantém o que o usuário já marcou (usado na digitação manual).
  function aplicarPerfilAtividade(atividade: string, mesclar = false) {
    const perfil = perfilPorAtividade(atividade)
    if (!perfil) return null
    setRamosSel(prev => (mesclar ? [...new Set([...prev, ...perfil.ramos])] : [...perfil.ramos]))
    const setPct = {
      terrestre:   setPctTerrestre,
      aereo:       setPctAereo,
      aquaviario:  setPctAquaviario,
      ferroviario: setPctFerroviario,
    }[perfil.modal]
    setPct(atual => (mesclar && atual ? atual : 100))
    return perfil
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

  // Grava uma tabela filha só se o conteúdo mudou desde a última gravação.
  // A marca é registrada depois do sucesso: se a escrita falhar, a próxima
  // tentativa reescreve a seção em vez de considerá-la salva.
  async function gravarFilhaSeMudou(chave: string, dados: unknown[], gravar: () => Promise<unknown>) {
    const atual = JSON.stringify(dados)
    if (filhasRef.current[chave] === atual) return
    await gravar()
    filhasRef.current[chave] = atual
  }

  // ── Salvar tudo ─────────────────────────────────────────────
  // Usada pelo botão Salvar (redirecionar = true) e pelo autosave (false).
  // No autosave o erro é propagado para o chamador marcar o status, em vez de alertar.
  async function persistir(redirecionar: boolean) {
    if (!corretora) return
    if (redirecionar) setSalvando(true)
    try {
      // 1. Criar ou usar cliente existente
      let cId = clienteIdRef.current ?? clienteId
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
        clienteIdRef.current = cId
      }

      // 2. Criar OU atualizar cotação
      // cotacaoIdRef guarda o id assim que a cotação existe — inclusive quando foi o
      // próprio autosave que a criou durante o preenchimento de uma cotação nova.
      let coid: string
      const idExistente = cotacaoIdRef.current
      if (idExistente) {
        // Já existe — atualiza
        coid = idExistente
        await atualizarCotacao(coid, {
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
          pct_frota: pctFrota,
          pct_transportadoras: pctTransp,
          pct_agregado: pctAgregado,
          pct_autonomo: pctAutonomo,
        } as never)
      } else {
      // Modo criação — nova cotação
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

      coid = (cotacao as Record<string, unknown>).id as string
      cotacaoIdRef.current = coid
      } // fim else modo criação

      // 3. Atualizar campos extras (ramos múltiplos, averbação, sinistros, etc.)
      await atualizarCotacao(coid, {
        cliente_id: cId ?? undefined,
        ramos: ramosSel as never,
        embarcador_tn: embTN as never,
        embarcador_exportacao: embExp as never,
        embarcador_importacao: embImp as never,
        averb_atm: avAtm as never,
        averb_ndd: avNdd as never,
        averb_outro: avOutro as never,
        averb_contato_nome: avContatoNome as never,
        averb_contato_email: avContatoEmail as never,
        averb_contato_telefone: avContatoTel as never,
        averb_email_fatura: avEmailFatura as never,
        obs_sazonalidade: obsSazonalidade as never,
        detalhes_operacao: detalhesOp as never,
        sinistros_periodo: sinPeriodo as never,
        sinistros_detalhes: sinDetalhes as never,
        condicoes_particulares: condParticulares as never,
        gerenc_rastreador_fornecedor: rastrFornecedor as never,
        gerenc_rastreador_tipo: rastrTipo as never,
        gerenc_detalhes: gerencDetalhes as never,
        assinatura_local: assLocal as never,
        assinatura_data: assData || null as never,
      } as never)

      // 4. Salvar tabelas filhas — apenas as seções alteradas.
      // A comparação usa o payload já filtrado, o mesmo que iria para o banco,
      // então digitar numa linha em branco que seria descartada não gera escrita.
      const merc = mercadorias.filter(m => m.tipo)
      const perc = percursos.filter(p => p.origem && p.destino)
      const exp = expAnterior.filter(e => e.seguradora)
        .map(e => ({ ...e, premio_pago: e.premio_pago ? Number(e.premio_pago) : null }))
      const cond = condicaoAtual.filter(c => c.lmg || c.ramo)
        .map(c => ({ ...c, premio_minimo: c.premio_minimo ? Number(c.premio_minimo) : null }))
      const sin = sinistros.filter(s => s.data_sinistro || s.ramo)
        .map(s => ({ ...s, valor_prejuizo: s.valor_prejuizo ? Number(s.valor_prejuizo) : null }))
      const ddr = ddrs.filter(d => d.embarcador || d.seguradora)
      const ger = gerenciadoras.filter(g => g.gerenciadora)
      const cpre = condPretendidas.filter(c => c.lmg || c.ramo)
        .map(c => ({ ...c, premio_minimo: c.premio_minimo ? Number(c.premio_minimo) : null }))

      await Promise.all([
        gravarFilhaSeMudou('mercadorias', merc, () => salvarMercadorias(coid, merc)),
        gravarFilhaSeMudou('percursos', perc, () => salvarPercursos(coid, perc)),
        gravarFilhaSeMudou('experiencia', exp, () => salvarTabelaFilha('cotacao_experiencia_anterior', coid, exp)),
        gravarFilhaSeMudou('condicaoAtual', cond, () => salvarTabelaFilha('cotacao_condicao_atual', coid, cond)),
        gravarFilhaSeMudou('sinistros', sin, () => salvarTabelaFilha('cotacao_sinistros', coid, sin)),
        gravarFilhaSeMudou('ddrs', ddr, () => salvarTabelaFilha('cotacao_ddrs', coid, ddr)),
        gravarFilhaSeMudou('gerenciadoras', ger, () => salvarTabelaFilha('cotacao_gerenciadoras', coid, ger)),
        gravarFilhaSeMudou('condPretendidas', cpre, () => salvarTabelaFilha('cotacao_condicoes_pretendidas', coid, cpre)),
      ])

      if (redirecionar) router.push(`/cotacoes/${coid}`)
    } catch (e) {
      console.error(e)
      if (!redirecionar) { setSalvando(false); throw e }
      alert('Erro ao salvar. Verifique os dados e tente novamente.')
    }
    if (redirecionar) setSalvando(false)
  }

  const handleSalvar = () => persistir(true)

  // ── Navegação ────────────────────────────────────────────────
  const Nav = ({ back, next, isLast }: { back?: () => void; next?: () => void; isLast?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
      <button type="button" onClick={back ?? (() => setEtapa(e => e - 1))} disabled={etapa === 1}
        className="btn-secondary" style={{ fontSize: 13 }}>
        <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Voltar
      </button>
      {!isLast ? (
        <button type="button" onClick={next ?? (() => setEtapa(e => e + 1))}
          className="btn-primary" style={{ fontSize: 13 }}>
          Continuar <i className="ti ti-arrow-right" style={{ fontSize: 14 }} />
        </button>
      ) : (
        <button type="button" onClick={handleSalvar} disabled={salvando}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#059669", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          {salvando ? "Salvando..." : "✓ Salvar cotação"}
        </button>
      )}
    </div>
  )

  // ── Render ───────────────────────────────────────────────────
  // Bloqueio por limite de cotações
  if (!cota.carregando && !cota.pode) {
    return (
      <div style={{ maxWidth: 500, margin: '80px auto', padding: 20, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#2d0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <i className="ti ti-lock" style={{ fontSize: 26, color: '#f85149' }} aria-hidden="true" />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 10px' }}>
          {cota.motivo === 'plano_vencido' ? 'Trial encerrado' : 'Limite de cotações atingido'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 8px', lineHeight: 1.6 }}>
          {cota.mensagem}
        </p>
        {cota.limite && (
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 24px' }}>
            {cota.usadas} de {cota.limite} cotações usadas este mês
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => router.push('/cotacoes')}
            style={{ padding: '9px 18px', background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-2)', fontSize: 13, cursor: 'pointer' }}>
            Voltar
          </button>
          <button onClick={() => router.push('/configuracoes')}
            style={{ padding: '9px 18px', background: '#f85149', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Fazer upgrade
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => modoEdicao ? router.push(`/cotacoes/${editarId}`) : router.push("/cotacoes")} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-2)" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 15 }} />
        </button>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>{modoEdicao ? 'Editar cotação' : 'Nova cotação'}</h1>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{modoEdicao ? 'Altere os dados e salve' : 'Preencha os dados do questionário'}</p>
        </div>
        {autoStatus !== 'idle' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginLeft: 'auto',
            color: autoStatus === 'erro' ? '#f85149' : autoStatus === 'salvando' ? 'var(--text-3)' : '#3fb950' }}>
            <i className={`ti ${autoStatus === 'erro' ? 'ti-alert-circle' : autoStatus === 'salvando' ? 'ti-loader-2' : 'ti-cloud-check'}`}
              style={{ fontSize: 14 }} aria-hidden="true" />
            {autoStatus === 'salvando' ? 'Salvando…'
              : autoStatus === 'erro' ? 'Falha ao salvar — use o botão Salvar'
              : `Salvo${salvoEm ? ` às ${salvoEm}` : ''}`}
          </div>
        )}
      </div>

      <StepHeader etapa={etapa} total={ETAPAS.length} />

      <div className="card" style={{ padding: 24 }}>

        {/* ══════════ ETAPA 1 — CADASTRO ══════════ */}
        {etapa === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* CNPJ */}
            <div>
              <Label>CNPJ</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={cnpj} onChange={e => setCnpj(formatCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00" className="field-input" style={{ flex: 1, fontSize: 13 }} />
                <button type="button" onClick={handleBuscarCNPJ} disabled={buscandoCNPJ || !validarCNPJ(cnpj)}
                  className="btn-secondary" style={{ fontSize: 12, whiteSpace: 'nowrap', opacity: (!validarCNPJ(cnpj) || buscandoCNPJ) ? .5 : 1 }}>
                  <i className={`ti ${buscandoCNPJ ? 'ti-loader-2' : 'ti-search'}`} style={{ fontSize: 13 }} />
                  {buscandoCNPJ ? 'Buscando...' : 'Receita Federal'}
                </button>
              </div>
              {cnpjStatus === 'ok' && <p style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>{clienteId ? '✓ Cliente encontrado na base' : '✓ Dados preenchidos — cliente será cadastrado automaticamente'}</p>}
              {cnpjStatus === 'error' && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>✗ CNPJ não encontrado</p>}
            </div>

            {/* Dados cadastrais */}
            <p className="section-heading">Dados cadastrais</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Razão social</Label>
                <Input value={dadosCadastro.razao_social} onChange={v => setC('razao_social', v)} />
              </div>
              <div><Label>Nome fantasia</Label><Input value={dadosCadastro.nome_fantasia} onChange={v => setC('nome_fantasia', v)} /></div>
              <div>
                <Label>Atividade principal</Label>
                <Input value={dadosCadastro.atividade_principal} onChange={v => {
                  setC('atividade_principal', v)
                  // Seleção automática de ramos conforme o modal da atividade
                  aplicarPerfilAtividade(v, true)
                }} />
                {(() => {
                  const perfil = perfilPorAtividade(dadosCadastro.atividade_principal)
                  if (!perfil) return null
                  return (
                    <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="ti ti-check" style={{ fontSize: 12 }} aria-hidden="true" />
                      {perfil.rotulo} — {listar(perfil.ramos)} selecionados automaticamente
                    </p>
                  )
                })()}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Endereço</Label><Input value={dadosCadastro.endereco} onChange={v => setC('endereco', v)} />
              </div>
              <div><Label>CEP</Label><Input value={dadosCadastro.cep} onChange={v => setC('cep', v)} /></div>
              <div><Label>Cidade / UF</Label><Input value={dadosCadastro.cidade_uf} onChange={v => setC('cidade_uf', v)} /></div>
              <div><Label>Site</Label><Input value={dadosCadastro.site} onChange={v => setC('site', v)} /></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="field-label" style={{ margin: 0 }}>ANTT / RNTRC</label>
                  <BadgeANTT
                    resultado={antt.resultado}
                    consultando={antt.consultando}
                    pendente={antt.pendente}
                    erro={antt.erro}
                    onConsultar={() => antt.consultar(cnpj)}
                    compact
                  />
                </div>
                <Input value={dadosCadastro.antt} onChange={v => setC('antt', v)} placeholder="Nº RNTRC (preenchido automaticamente)" />
                {/* Badge completo com detalhes */}
                {(antt.resultado || antt.erro) && !antt.consultando && (
                  <div style={{ marginTop: 8 }}>
                    <BadgeANTT
                      resultado={antt.resultado}
                      consultando={false}
                      pendente={antt.pendente}
                      erro={antt.erro}
                      onConsultar={() => antt.consultar(cnpj)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Contato */}
            <p className="section-heading">Contato</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Nome do contato</Label><Input value={dadosCadastro.contato_nome} onChange={v => setC('contato_nome', v)} />
              </div>
              <div><Label>Telefone</Label><Input value={dadosCadastro.contato_telefone} onChange={v => setC('contato_telefone', v)} /></div>
              <div><Label>E-mail</Label><Input value={dadosCadastro.contato_email} onChange={v => setC('contato_email', v)} type="email" /></div>
            </div>

            <Nav next={() => { if (!dadosCadastro.razao_social) { alert('Preencha a Razão Social.'); return } setEtapa(2) }} />
          </div>
        )}

        {/* ══════════ ETAPA 2 — RAMOS ══════════ */}
        {etapa === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Ramos transportadores */}
            <div>
              <p className="section-heading">Transportadores</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {RAMOS.map(r => (
                  <button key={r} type="button" onClick={() => toggleRamo(r)}
                    style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1px solid ${ramosSel.includes(r) ? "var(--accent)" : "var(--border-color)"}`, background: ramosSel.includes(r) ? "var(--accent-light)" : "var(--bg-card)", color: ramosSel.includes(r) ? "var(--accent-text)" : "var(--text-2)" }}>
                    {r}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Obs: com exceção RC-DC, caso tenha mais de 1 ramo, deverá ser preenchido 1 questionário por ramo.</p>
            </div>

            {/* Embarcador */}
            <div>
              <p className="section-heading">Embarcador</p>
              <div style={{ display: "flex", gap: 16 }}>
                {[['TN', embTN, setEmbTN], ['Exportação', embExp, setEmbExp], ['Importação', embImp, setEmbImp]].map(([label, val, set]) => (
                  <label key={label as string} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-1)", cursor: "pointer" }}>
                    <input type="checkbox" checked={val as boolean} onChange={e => (set as (v: boolean) => void)(e.target.checked)}
                      style={{ width: 15, height: 15, cursor: "pointer" }} />
                    {label as string}
                  </label>
                ))}
              </div>
            </div>

            {/* Averbação */}
            <div>
              <p className="section-heading">Dados da averbação</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                {[['AT&M', avAtm, setAvAtm], ['NDD', avNdd, setAvNdd]].map(([lbl, val, set]) => (
                  <label key={lbl as string} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-1)", cursor: "pointer" }}>
                    <input type="checkbox" checked={val as boolean} onChange={e => (set as (v: boolean) => void)(e.target.checked)} style={{ width: 15, height: 15, cursor: "pointer" }} />
                    {lbl as string}
                  </label>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-1)", cursor: "pointer" }}>
                    <input type="checkbox" checked={!!avOutro} onChange={e => !e.target.checked && setAvOutro('')} style={{ width: 15, height: 15, cursor: "pointer" }} />
                    Outro:
                  </label>
                  <input value={avOutro} onChange={e => setAvOutro(e.target.value)} placeholder="Especificar"
                    className="field-input" style={{ width: 110, fontSize: 12 }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div><Label>Contato — Nome</Label><Input value={avContatoNome} onChange={setAvContatoNome} /></div>
                <div><Label>E-mail</Label><Input value={avContatoEmail} onChange={setAvContatoEmail} type="email" /></div>
                <div><Label>Telefone</Label><Input value={avContatoTel} onChange={setAvContatoTel} /></div>
                <div style={{ gridColumn: "1 / -1" }}><Label>E-mail para envio da fatura</Label><Input value={avEmailFatura} onChange={setAvEmailFatura} type="email" /></div>
              </div>
            </div>

            {/* Tipos de transporte */}
            <div>
              <p className="section-heading">Tipos de transporte (%)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[['Terrestre', pctTerrestre, setPctTerrestre], ['Aéreo', pctAereo, setPctAereo],
                  ['Aquaviário (Fluvial, Marítimo)', pctAquaviario, setPctAquaviario], ['Ferroviário', pctFerroviario, setPctFerroviario]].map(([lbl, val, set]) => (
                  <div key={lbl as string} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--text-2)", width: 144, flexShrink: 0 }}>{lbl as string}</span>
                    <input type="number" min={0} max={100} value={val as number}
                      onChange={e => (set as (v: number) => void)(Number(e.target.value))}
                      className="field-input" style={{ width: 70, textAlign: "right", fontSize: 13 }} />
                    <span style={{ fontSize: 13, color: "var(--text-3)" }}>%</span>
                  </div>
                ))}
              </div>
              <PctTotal campos={[pctTerrestre, pctAereo, pctAquaviario, pctFerroviario]} />
            </div>

            {/* Mercadorias */}
            <div>
              <p className="section-heading">Mercadorias</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {mercadorias.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <InputMercadoria value={m.tipo}
                      onChange={v => setMercadorias(p => p.map((x, j) => j === i ? { ...x, tipo: v } : x))} />
                    <input value={m.embarcador} onChange={e => setMercadorias(p => p.map((x, j) => j === i ? { ...x, embarcador: e.target.value } : x))}
                      placeholder="Embarcador" className="field-input" style={{ fontSize: 12 }} />
                    <input type="number" min={0} max={100} value={m.percentual}
                      onChange={e => setMercadorias(p => {
                        // Limita ao que ainda falta para 100% considerando as demais linhas
                        const outras = p.reduce((s, x, j) => (j === i ? s : s + (x.percentual || 0)), 0)
                        const val = Math.max(0, Math.min(Number(e.target.value) || 0, 100 - outras))
                        return p.map((x, j) => (j === i ? { ...x, percentual: val } : x))
                      })}
                      placeholder="0" className="field-input" style={{ width: 60, textAlign: "right", fontSize: 12 }} />
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>%</span>
                    <DelBtn onClick={() => setMercadorias(p => p.filter((_, j) => j !== i))} />
                  </div>
                ))}
                <TableAddBtn onClick={() => setMercadorias(p => [...p, { tipo: '', embarcador: '', percentual: 0 }])} />
                <PctTotal campos={mercadorias.map(m => m.percentual)} />
              </div>
            </div>

            {/* Percursos */}
            <div>
              <p className="section-heading">Percursos</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {percursos.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input value={p.origem} onChange={e => setPercursos(prev => prev.map((x, j) => j === i ? { ...x, origem: e.target.value } : x))}
                      placeholder="Origem (UF/Cidade)" className="field-input" style={{ fontSize: 12 }} />
                    <input value={p.destino} onChange={e => setPercursos(prev => prev.map((x, j) => j === i ? { ...x, destino: e.target.value } : x))}
                      placeholder="Destino (UF/Cidade)" className="field-input" style={{ fontSize: 12 }} />
                    <input type="number" value={p.percentual} onChange={e => setPercursos(prev => prev.map((x, j) => j === i ? { ...x, percentual: Number(e.target.value) } : x))}
                      placeholder="%" className="field-input" style={{ width: 60, textAlign: "right", fontSize: 12 }} />
                    <DelBtn onClick={() => setPercursos(prev => prev.filter((_, j) => j !== i))} />
                  </div>
                ))}
                <TableAddBtn onClick={() => setPercursos(p => [...p, { origem: '', destino: '', percentual: 0 }])} />
                <PctTotal campos={percursos.map(p => p.percentual)} />
              </div>
            </div>

            <Nav />
          </div>
        )}

        {/* ══════════ ETAPA 3 — OPERAÇÃO ══════════ */}
        {etapa === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <p className="section-heading">Operação — Quantidade de viagens e valores/mês</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><Label>Quantidade de embarques</Label><Input value={qtdEmbarques} onChange={setQtdEmbarques} type="number" placeholder="0" /></div>
                <div><Label>Valor médio por embarque (R$)</Label><Input value={vlrMedio} onChange={setVlrMedio} type="number" placeholder="0,00" /></div>
                <div><Label>Valor máximo por embarque (R$)</Label><Input value={vlrMaximo} onChange={setVlrMaximo} type="number" placeholder="0,00" /></div>
                <div><Label>Importância segurada total (R$)</Label><Input value={vlrTotal} onChange={setVlrTotal} type="number" placeholder="0,00" /></div>
                <div style={{ gridColumn: "1 / -1" }}><Label>Obs. sazonalidade / safra</Label><Textarea value={obsSazonalidade} onChange={setObsSazonalidade} rows={2} /></div>
              </div>
            </div>

            <div>
              <p className="section-heading">Detalhes da operação</p>
              <Textarea value={detalhesOp} onChange={setDetalhesOp} rows={4} placeholder="Descrever detalhes da operação..." />
            </div>

            <div>
              <p className="section-heading">Motoristas (%)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[['Frota', pctFrota, setPctFrota], ['Transportadoras (sub-contratadas)', pctTransp, setPctTransp],
                  ['Agregado', pctAgregado, setPctAgregado], ['Autônomo', pctAutonomo, setPctAutonomo]].map(([lbl, val, set]) => (
                  <div key={lbl as string} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--text-2)", width: 200, flexShrink: 0 }}>{lbl as string}</span>
                    <input type="number" min={0} max={100} value={val as number}
                      onChange={e => (set as (v: number) => void)(Number(e.target.value))}
                      className="field-input" style={{ width: 70, textAlign: "right", fontSize: 13 }} />
                    <span style={{ fontSize: 13, color: "var(--text-3)" }}>%</span>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Experiência anterior */}
            <div>
              <p className="section-heading">Experiência anterior</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    {['Seguradora','Corretor','Ramo','Vigência','Prêmio Pago',''].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-3)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".3px" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {expAnterior.map((e, i) => (
                      <tr key={i}>
                        {(['seguradora','corretor','ramo','vigencia','premio_pago'] as const).map(k => (
                          <td key={k} style={{ padding: "4px" }}>
                            <input value={e[k]} onChange={ev => setExpAnterior(p => p.map((x, j) => j === i ? { ...x, [k]: ev.target.value } : x))}
                              className="field-input" style={{ fontSize: 12 }} />
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
              <p className="section-heading">Condição atual</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    {['LMG','Ramo','Taxa','P.O.S.','Prêmio Mínimo',''].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-3)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".3px" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {condicaoAtual.map((c, i) => (
                      <tr key={i}>
                        {(['lmg','ramo','taxa','pos','premio_minimo'] as const).map(k => (
                          <td key={k} style={{ padding: "4px" }}>
                            <input value={c[k]} onChange={ev => setCondicaoAtual(p => p.map((x, j) => j === i ? { ...x, [k]: ev.target.value } : x))}
                              className="field-input" style={{ fontSize: 12 }} />
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
              <p className="section-heading">Sinistros</p>
              <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>Experiência:</span>
                {[['12', '12 meses'], ['24', '24 meses'], ['36', '36 meses'], ['nao_houve', 'Não houve']].map(([val, lbl]) => (
                  <label key={val} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-1)", cursor: "pointer" }}>
                    <input type="checkbox" checked={sinPeriodo === val} onChange={() => setSinPeriodo(p => p === val ? '' : val)}
                      style={{ width: 15, height: 15, cursor: "pointer" }} />
                    {lbl}
                  </label>
                ))}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    {['Data','Ramo','Local Origem','Local Destino','Valor Prejuízo',''].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-3)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".3px" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {sinistros.map((s, i) => (
                      <tr key={i}>
                        {(['data_sinistro','ramo','local_origem','local_destino','valor_prejuizo'] as const).map(k => (
                          <td key={k} style={{ padding: "4px" }}>
                            <input value={s[k]} onChange={ev => setSinistros(p => p.map((x, j) => j === i ? { ...x, [k]: ev.target.value } : x))}
                              placeholder={k === 'data_sinistro' ? 'DD/MM/AAAA' : ''}
                              className="field-input" style={{ fontSize: 12 }} />
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
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* DDRs */}
            <div>
              <p className="section-heading">DDRs</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    {['Embarcador','Seguradora','LMG','Vigência',''].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-3)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".3px" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {ddrs.map((d, i) => (
                      <tr key={i}>
                        {(['embarcador','seguradora','lmg','vigencia'] as const).map(k => (
                          <td key={k} style={{ padding: "4px" }}>
                            <input value={d[k]} onChange={ev => setDdrs(p => p.map((x, j) => j === i ? { ...x, [k]: ev.target.value } : x))}
                              className="field-input" style={{ fontSize: 12 }} />
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
              <p className="section-heading">Gerenciamento de riscos</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-3)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".3px" }}>Gerenciadora</th>
                    <th className="text-center py-1.5 px-2 text-gray-500 font-medium">Cadastro</th>
                    <th className="text-center py-1.5 px-2 text-gray-500 font-medium">Vitimologia</th>
                    <th className="text-center py-1.5 px-2 text-gray-500 font-medium">Monitoramento</th>
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {gerenciadoras.map((g, i) => (
                      <tr key={i}>
                        <td style={{ padding: "4px" }}>
                          <input value={g.gerenciadora} onChange={e => setGerenciadoras(p => p.map((x, j) => j === i ? { ...x, gerenciadora: e.target.value } : x))}
                            placeholder="Nome da gerenciadora"
                            className="field-input" style={{ fontSize: 12 }} />
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
              <p className="section-heading">Rastreador</p>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Label>Fornecedor</Label>
                  <input value={rastrFornecedor} onChange={e => setRastrFornecedor(e.target.value)}
                    className="field-input" style={{ width: 140, fontSize: 13 }} />
                </div>
                {[['gsm_gprs','GSM/GPRS'], ['hibrido','Híbrido'], ['rf_fixo_isca','RF Fixo / Isca']].map(([val, lbl]) => (
                  <label key={val} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-1)", cursor: "pointer" }}>
                    <input type="checkbox" checked={rastrTipo === val} onChange={() => setRastrTipo(p => p === val ? '' : val)} style={{ width: 15, height: 15, cursor: "pointer" }} />
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
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Condições pretendidas */}
            <div>
              <p className="section-heading">Condições pretendidas</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    {['LMG','Ramo','Taxa','P.O.S. (Franquia)','Prêmio Mínimo',''].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-3)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".3px" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {condPretendidas.map((c, i) => (
                      <tr key={i}>
                        {(['lmg','ramo','taxa','pos_franquia','premio_minimo'] as const).map(k => (
                          <td key={k} style={{ padding: "4px" }}>
                            <input value={c[k]} onChange={ev => setCondPretendidas(p => p.map((x, j) => j === i ? { ...x, [k]: ev.target.value } : x))}
                              className="field-input" style={{ fontSize: 12 }} />
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
              <p className="section-heading">Condições particulares</p>
              <Textarea value={condParticulares} onChange={setCondParticulares} rows={5} placeholder="Descrever condições particulares..." />
            </div>

            {/* Declaração */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <p className="section-heading">Declaração</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Declaro que as informações aqui presentes são verídicas e autorizo as seguradoras a realizar quaisquer pesquisas que julgarem necessárias para a apuração dos dados contidos neste questionário. Nesta forma estou ciente que a simples apresentação deste questionário junto às seguradoras do mercado não representa nenhum compromisso de nenhuma delas de aceitar o risco proposto.
              </p>
            </div>

            {/* Assinatura */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
