'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────
interface Cobranca {
  id: string; corretora_id: string; descricao: string; valor: number
  vencimento: string; status: string; tipo: string; mes_referencia: string | null
  pago_em: string | null; pago_valor: number | null; forma_pagamento: string | null
  observacoes: string | null; criado_em: string
  corretora?: { nome: string; plano_assinatura: string }
}
interface Corretora {
  id: string; nome: string; plano_assinatura: string
  status_assinatura: string; plano_valor: number | null
}
interface Plano {
  id: string; nome: string; nome_exibicao: string
  max_cotacoes: number | null; valor_mensal: number
}

// ─── Helpers ─────────────────────────────────────────────────
const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const C = {
  bg: '#0d1117', surface: '#161b22', card: '#0d1117',
  border: '#30363d', text: '#e6edf3', muted: '#8b949e', dim: '#484f58',
}

// ─── Gráfico barras 6 meses ───────────────────────────────────
function BarChart({ dados }: { dados: { mes: string; faturado: number; recebido: number }[] }) {
  const max = Math.max(1, ...dados.flatMap(d => [d.faturado, d.recebido]))
  const W = 560, H = 200, pad = 30, bw = (W - pad * 2) / dados.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {[0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={pad} y1={H - 28 - (H - 52) * t} x2={W - pad} y2={H - 28 - (H - 52) * t}
          stroke="rgba(255,255,255,.05)" strokeWidth="1" />
      ))}
      {dados.map((d, i) => {
        const x = pad + i * bw
        const hF = (H - 52) * (d.faturado / max)
        const hR = (H - 52) * (d.recebido / max)
        const w = bw * 0.3
        return (
          <g key={i}>
            <rect x={x + bw * 0.14} y={H - 28 - hF} width={w} height={hF} rx="3" fill="#3b82f6" opacity=".85" />
            <rect x={x + bw * 0.52} y={H - 28 - hR} width={w} height={hR} rx="3" fill="#22c55e" />
            <text x={x + bw * 0.5} y={H - 10} fontSize="9" fill={C.muted} textAnchor="middle">{d.mes}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Donut receita por plano ──────────────────────────────────
function DonutChart({ dados, total }: { dados: { nome: string; receita: number }[]; total: number }) {
  const CORES = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444']
  const R = 68, r = 42, cx = 88, cy = 88
  let ang = -Math.PI / 2
  const arcos = dados.map((d, i) => {
    const frac = total > 0 ? d.receita / total : 0
    const a0 = ang, a1 = ang + frac * Math.PI * 2; ang = a1
    const large = frac > 0.5 ? 1 : 0
    const path = `M ${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)} A ${R} ${R} 0 ${large} 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)} L ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} A ${r} ${r} 0 ${large} 0 ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} Z`
    return { path, cor: CORES[i % CORES.length], nome: d.nome, receita: d.receita, frac }
  })
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 176 176" style={{ width: 140, height: 140, flexShrink: 0 }}>
        {arcos.map((a, i) => <path key={i} d={a.path} fill={a.cor} />)}
        <text x={cx} y={cy - 6} fontSize="11" fill={C.muted} textAnchor="middle">MRR</text>
        <text x={cx} y={cy + 10} fontSize="13" fontWeight="700" fill={C.text} textAnchor="middle">
          {total > 0 ? `R$${(total / 1000).toFixed(1)}k` : 'R$0'}
        </text>
      </svg>
      <div style={{ flex: 1, minWidth: 130 }}>
        {arcos.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: a.cor, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{a.nome}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: a.cor }}>{Math.round(a.frac * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Linha fluxo 30 dias ──────────────────────────────────────
function LineChart({ dados }: { dados: { data: Date; valor: number }[] }) {
  if (!dados.length) return <p style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Nenhum vencimento nos próximos 30 dias.</p>
  const W = 520, H = 170, pad = 32
  const max = Math.max(1, ...dados.map(d => d.valor))
  const x0 = Date.now(), xN = x0 + 30 * 86400000
  const px = (d: Date) => pad + (W - pad * 2) * ((d.getTime() - x0) / (xN - x0))
  const py = (v: number) => (H - 28) - (H - 48) * (v / max)
  const pts = dados.map(d => `${px(d.data)},${py(d.valor)}`).join(' ')
  const last = dados[dados.length - 1]
  const area = `M ${pad},${H - 28} L ${pts} L ${px(last.data)},${H - 28} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {[0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={pad} y1={py(max * t)} x2={W - pad} y2={py(max * t)} stroke="rgba(255,255,255,.05)" strokeWidth="1" />
      ))}
      <path d={area} fill="rgba(139,92,246,.12)" />
      <polyline points={pts} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinejoin="round" />
      {dados.map((d, i) => <circle key={i} cx={px(d.data)} cy={py(d.valor)} r="3" fill="#8b5cf6" />)}
      <text x={pad} y={H - 8} fontSize="9" fill={C.muted}>hoje</text>
      <text x={W - pad} y={H - 8} fontSize="9" fill={C.muted} textAnchor="end">+30 dias</text>
    </svg>
  )
}

// ─── KPI card ─────────────────────────────────────────────────
function KPI({ label, value, sub, cor, icon }: { label: string; value: string | number; sub?: string; cor: string; icon: string }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</span>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color: cor }} aria-hidden="true" />
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: cor, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────
function Badge({ status }: { status: string }) {
  const MAP: Record<string, { bg: string; text: string; label: string }> = {
    pendente:  { bg: '#2d1a00', text: '#f59e0b', label: 'Pendente' },
    pago:      { bg: '#0d2b1a', text: '#3fb950', label: 'Pago' },
    vencido:   { bg: '#2d0e0e', text: '#f85149', label: 'Vencido' },
    cancelado: { bg: '#21262d', text: '#484f58', label: 'Cancelado' },
  }
  const s = MAP[status] ?? MAP.pendente
  return <span style={{ background: s.bg, color: s.text, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{s.label}</span>
}

// ─── Página principal ─────────────────────────────────────────
export default function FinanceiroPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createClient() as any
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [corretoras, setCorretoras] = useState<Corretora[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<'overview' | 'receitas' | 'cobrancas' | 'previsao'>('overview')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroCorretora, setFiltroCorretora] = useState('todas')
  const [modalPagar, setModalPagar] = useState<Cobranca | null>(null)
  const [modalNova, setModalNova] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [formPagar, setFormPagar] = useState({ pago_em: '', pago_valor: '', forma_pagamento: 'pix', observacoes: '' })
  const [formNova, setFormNova] = useState({ corretora_id: '', descricao: '', valor: '', vencimento: '', tipo: 'mensalidade', mes_referencia: '', observacoes: '' })
  const [gerandoMensais, setGerandoMensais] = useState(false)

  async function carregar() {
    const [cbR, corrR, plR] = await Promise.all([
      sb.from('cobrancas').select('*, corretora:corretoras(nome, plano_assinatura)').order('vencimento', { ascending: false }),
      sb.from('corretoras').select('id, nome, plano_assinatura, status_assinatura, plano_valor').eq('excluido', false),
      sb.from('planos').select('*').order('valor_mensal'),
    ])
    setCobrancas(cbR.data ?? [])
    setCorretoras(corrR.data ?? [])
    setPlanos(plR.data ?? [])
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  // ── Cálculos ──────────────────────────────────────────────
  const hoje = new Date()
  const ativas = useMemo(() => corretoras.filter(c => c.status_assinatura === 'ativa'), [corretoras])

  const mrr = useMemo(() => ativas.reduce((s, c) => {
    const p = planos.find(p => p.nome === c.plano_assinatura)
    return s + (Number(p?.valor_mensal) || 0)
  }, 0), [ativas, planos])

  const arr = mrr * 12
  const ticketMedio = ativas.length > 0 ? mrr / ativas.length : 0
  const churn = corretoras.filter(c => c.status_assinatura === 'cancelada').length
  const churnRate = corretoras.length > 0 ? ((churn / corretoras.length) * 100).toFixed(1) : '0.0'
  const inadimplentes = corretoras.filter(c => c.status_assinatura === 'inadimplente').length

  const totalRecebido = useMemo(() => cobrancas.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.pago_valor ?? c.valor), 0), [cobrancas])
  const totalPendente = useMemo(() => cobrancas.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0), [cobrancas])
  const cobVencidas = useMemo(() => cobrancas.filter(c => c.status === 'pendente' && new Date(c.vencimento) < hoje), [cobrancas])
  const totalVencido = cobVencidas.reduce((s, c) => s + Number(c.valor), 0)
  const baseInad = totalVencido + totalRecebido
  const inadPct = baseInad > 0 ? (totalVencido / baseInad * 100).toFixed(1) : '0.0'

  // Recebido este mês
  const recebidoMes = useMemo(() => cobrancas.filter(c => c.status === 'pago' && c.pago_em?.startsWith(hoje.toISOString().slice(0, 7))).reduce((s, c) => s + Number(c.pago_valor ?? c.valor), 0), [cobrancas])

  // Receita por plano (donut)
  const receitaPorPlano = useMemo(() => planos.map(p => {
    const cli = ativas.filter(c => c.plano_assinatura === p.nome).length
    return { nome: p.nome_exibicao, receita: cli * Number(p.valor_mensal), clientes: cli }
  }).filter(p => p.receita > 0), [planos, ativas])

  // 6 meses: faturado vs recebido
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const serie6 = useMemo(() => [5, 4, 3, 2, 1, 0].map(offset => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - offset, 1)
    const ym = (dt: Date) => dt.getFullYear() * 12 + dt.getMonth()
    const alvo = ym(d)
    const doMes = cobrancas.filter(c => ym(new Date(c.vencimento)) === alvo)
    return {
      mes: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      faturado: doMes.reduce((s, c) => s + Number(c.valor), 0),
      recebido: doMes.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.pago_valor ?? c.valor), 0),
    }
  }), [cobrancas])

  // Fluxo 30 dias
  const fluxo30 = useMemo(() => {
    const em30 = new Date(hoje.getTime() + 30 * 86400000)
    let acc = 0
    return cobrancas
      .filter(c => c.status !== 'pago' && c.status !== 'cancelado' && new Date(c.vencimento) >= hoje && new Date(c.vencimento) <= em30)
      .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
      .map(c => { acc += Number(c.valor); return { data: new Date(c.vencimento), valor: acc } })
  }, [cobrancas])

  // Filtros de cobranças
  const cobFiltradas = useMemo(() => cobrancas.filter(c => {
    const ps = filtroStatus === 'todos' || c.status === filtroStatus || (filtroStatus === 'vencido' && c.status === 'pendente' && new Date(c.vencimento) < hoje)
    const pc = filtroCorretora === 'todas' || c.corretora_id === filtroCorretora
    return ps && pc
  }), [cobrancas, filtroStatus, filtroCorretora])

  // ── Ações ────────────────────────────────────────────────
  async function handlePagar() {
    if (!modalPagar) return
    setSalvando(true)
    await sb.from('cobrancas').update({
      status: 'pago',
      pago_em: formPagar.pago_em || hoje.toISOString().split('T')[0],
      pago_valor: Number(formPagar.pago_valor) || modalPagar.valor,
      forma_pagamento: formPagar.forma_pagamento,
      observacoes: formPagar.observacoes || null,
      atualizado_em: new Date().toISOString(),
    }).eq('id', modalPagar.id)
    setModalPagar(null)
    await carregar()
    setSalvando(false)
  }

  async function handleNova() {
    if (!formNova.corretora_id || !formNova.valor || !formNova.vencimento) return
    setSalvando(true)
    await sb.from('cobrancas').insert({
      ...formNova, valor: Number(formNova.valor), status: 'pendente',
      criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(),
    })
    setModalNova(false)
    setFormNova({ corretora_id: '', descricao: '', valor: '', vencimento: '', tipo: 'mensalidade', mes_referencia: '', observacoes: '' })
    await carregar()
    setSalvando(false)
  }

  async function handleGerarMensais() {
    if (!confirm('Gerar mensalidades para todas as corretoras ativas com plano pago?')) return
    setGerandoMensais(true)
    const { data } = await sb.rpc('gerar_cobrancas_mensais')
    alert(`✅ ${data ?? 0} cobrança(s) gerada(s)`)
    await carregar()
    setGerandoMensais(false)
  }

  async function handleCancelar(id: string) {
    if (!confirm('Cancelar esta cobrança?')) return
    await sb.from('cobrancas').update({ status: 'cancelado', atualizado_em: new Date().toISOString() }).eq('id', id)
    await carregar()
  }

  // ── Estilos reutilizáveis ─────────────────────────────────
  const inp: React.CSSProperties = { width: '100%', padding: '8px 11px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }
  const cardBox: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }
  const ABAS = [
    { id: 'overview', label: 'Visão geral', icon: 'ti-layout-dashboard' },
    { id: 'receitas', label: 'Receitas', icon: 'ti-trending-up' },
    { id: 'cobrancas', label: 'Cobranças', icon: 'ti-file-invoice' },
    { id: 'previsao', label: 'Previsão', icon: 'ti-telescope' },
  ] as const

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Financeiro</h1>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Gestão de receitas, cobranças e previsão</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleGerarMensais} disabled={gerandoMensais}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, color: C.muted, fontSize: 12, cursor: 'pointer' }}>
            <i className="ti ti-refresh" style={{ fontSize: 13 }} aria-hidden="true" />
            {gerandoMensais ? 'Gerando...' : 'Gerar mensalidades'}
          </button>
          <button onClick={() => setModalNova(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" /> Nova cobrança
          </button>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 22, background: C.surface, padding: 4, borderRadius: 10, width: 'fit-content', border: `1px solid ${C.border}` }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: aba === a.id ? 600 : 400, background: aba === a.id ? '#7c3aed' : 'transparent', color: aba === a.id ? '#fff' : C.muted, transition: 'all .15s' }}>
            <i className={`ti ${a.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
            {a.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted, fontSize: 13 }}>Carregando dados financeiros...</div>
      ) : (
        <>
          {/* ═══════════════════ VISÃO GERAL ═══════════════════ */}
          {aba === 'overview' && (
            <div>
              {/* KPIs principais */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 12 }}>
                <KPI label="MRR" value={fmt(mrr)} sub={`${ativas.length} corretoras ativas`} cor="#22c55e" icon="ti-trending-up" />
                <KPI label="Recebido este mês" value={fmt(recebidoMes)} sub="Faturas pagas no mês" cor="#3fb950" icon="ti-circle-check" />
                <KPI label="A receber" value={fmt(totalPendente)} sub={`${cobrancas.filter(c => c.status === 'pendente').length} pendentes`} cor="#f59e0b" icon="ti-clock" />
                <KPI label="Inadimplência" value={`${inadPct}%`} sub={`${fmt(totalVencido)} · ${cobVencidas.length} vencidas`} cor={Number(inadPct) > 5 ? '#f85149' : '#8b949e'} icon="ti-alert-triangle" />
              </div>

              {/* KPIs secundários */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
                <KPI label="ARR" value={fmt(arr)} sub="Receita anual recorrente" cor="#3b82f6" icon="ti-calendar-stats" />
                <KPI label="Ticket médio" value={fmt(ticketMedio)} sub="Por corretora ativa" cor="#8b5cf6" icon="ti-receipt" />
                <KPI label="Churn rate" value={`${churnRate}%`} sub={`${churn} canceladas`} cor={Number(churnRate) > 5 ? '#f85149' : '#22c55e'} icon="ti-chart-pie-off" />
                <KPI label="Inadimplentes" value={inadimplentes} sub="Corretoras em atraso" cor={inadimplentes > 0 ? '#f85149' : C.muted} icon="ti-bell-exclamation" />
              </div>

              {/* Gráfico barras */}
              <div style={{ ...cardBox, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Faturado vs Recebido · últimos 6 meses</span>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                    <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#3b82f6', display: 'inline-block' }} /> Faturado
                    </span>
                    <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} /> Recebido
                    </span>
                  </div>
                </div>
                <BarChart dados={serie6} />
              </div>

              {/* Donut + Linha */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={cardBox}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 14px' }}>Composição do MRR por plano</p>
                  {receitaPorPlano.length === 0
                    ? <p style={{ color: C.muted, fontSize: 12 }}>Nenhum plano pago ativo.</p>
                    : <DonutChart dados={receitaPorPlano} total={mrr} />}
                </div>
                <div style={cardBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Fluxo projetado · 30 dias</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6' }}>
                      {fmt(fluxo30[fluxo30.length - 1]?.valor ?? 0)}
                    </span>
                  </div>
                  <LineChart dados={fluxo30} />
                </div>
              </div>

              {/* Alertas */}
              {cobVencidas.length > 0 && (
                <div style={{ ...cardBox, border: `1px solid rgba(248,81,73,.3)` }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f85149', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: 15 }} aria-hidden="true" /> {cobVencidas.length} cobrança(s) vencida(s)
                  </p>
                  {cobVencidas.slice(0, 5).map(f => {
                    const cor = f.corretora as { nome?: string } | undefined
                    return (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{cor?.nome ?? '—'}</p>
                          <p style={{ fontSize: 11, color: '#f85149', margin: '2px 0 0' }}>
                            Venceu {new Date(f.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')} · {fmt(f.valor)}
                          </p>
                        </div>
                        <button onClick={() => { setModalPagar(f); setFormPagar({ pago_em: hoje.toISOString().split('T')[0], pago_valor: String(f.valor), forma_pagamento: 'pix', observacoes: '' }) }}
                          style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)', color: '#22c55e', borderRadius: 5, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          Registrar pago
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════ RECEITAS ═══════════════════════ */}
          {aba === 'receitas' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                <KPI label="MRR Total" value={fmt(mrr)} sub="" cor="#22c55e" icon="ti-coin" />
                <KPI label="Recebido (total)" value={fmt(totalRecebido)} sub="Todas as faturas pagas" cor="#3b82f6" icon="ti-circle-check" />
                <KPI label="A receber" value={fmt(totalPendente)} sub="" cor="#f59e0b" icon="ti-clock" />
              </div>

              <div style={cardBox}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>Distribuição por plano</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.card }}>
                      {['Plano', 'Corretoras', 'Valor/mês', 'Receita mensal', '% do MRR'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.4px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {planos.map(p => {
                      const cli = ativas.filter(c => c.plano_assinatura === p.nome).length
                      const rec = cli * Number(p.valor_mensal)
                      const pct = mrr > 0 ? (rec / mrr * 100).toFixed(1) : '0.0'
                      return (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '11px 14px', fontWeight: 600, color: C.text }}>{p.nome_exibicao}</td>
                          <td style={{ padding: '11px 14px', color: C.muted }}>{cli}</td>
                          <td style={{ padding: '11px 14px', color: C.muted }}>{Number(p.valor_mensal) === 0 ? 'Gratuito' : fmt(p.valor_mensal)}</td>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: '#22c55e' }}>{fmt(rec)}</td>
                          <td style={{ padding: '11px 14px', color: C.muted }}>{pct}%</td>
                        </tr>
                      )
                    })}
                    <tr style={{ borderTop: `2px solid ${C.border}`, background: C.card }}>
                      <td colSpan={3} style={{ padding: '11px 14px', fontWeight: 700, color: C.text }}>Total MRR</td>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#22c55e', fontSize: 15 }}>{fmt(mrr)}</td>
                      <td style={{ padding: '11px 14px', color: C.muted }}>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════ COBRANÇAS ══════════════════════ */}
          {aba === 'cobrancas' && (
            <div>
              {/* Filtros */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { v: 'todos', l: 'Todas' },
                    { v: 'pendente', l: 'Pendentes' },
                    { v: 'vencido', l: `Vencidas${cobVencidas.length > 0 ? ` (${cobVencidas.length})` : ''}` },
                    { v: 'pago', l: 'Pagas' },
                    { v: 'cancelado', l: 'Canceladas' },
                  ].map(s => (
                    <button key={s.v} onClick={() => setFiltroStatus(s.v)}
                      style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${filtroStatus === s.v ? '#7c3aed' : C.border}`, background: filtroStatus === s.v ? 'rgba(124,58,237,.15)' : 'transparent', color: filtroStatus === s.v ? '#a78bfa' : C.muted, fontSize: 12, cursor: 'pointer' }}>
                      {s.l}
                    </button>
                  ))}
                </div>
                <select value={filtroCorretora} onChange={e => setFiltroCorretora(e.target.value)}
                  style={{ ...inp, width: 'auto', minWidth: 180 }}>
                  <option value="todas">Todas as corretoras</option>
                  {corretoras.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div style={{ ...cardBox, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 12, color: C.muted }}>
                  {cobFiltradas.length} cobrança(s) · Total: {fmt(cobFiltradas.reduce((s, c) => s + Number(c.valor), 0))}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
                        {['Corretora', 'Descrição', 'Vencimento', 'Valor', 'Tipo', 'Status', ''].map(h => (
                          <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cobFiltradas.length === 0 && (
                        <tr><td colSpan={7} style={{ padding: 36, textAlign: 'center', color: C.muted }}>Nenhuma cobrança encontrada.</td></tr>
                      )}
                      {cobFiltradas.map(c => {
                        const vencida = c.status === 'pendente' && new Date(c.vencimento) < hoje
                        const cor = c.corretora as { nome?: string } | undefined
                        return (
                          <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#1c2330')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>{cor?.nome ?? '—'}</td>
                            <td style={{ padding: '10px 14px', color: C.muted, whiteSpace: 'nowrap' }}>{c.descricao}</td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: vencida ? '#f85149' : C.muted, fontWeight: vencida ? 600 : 400 }}>
                              {new Date(c.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                              {vencida && <span style={{ display: 'block', fontSize: 10 }}>⚠ Vencida</span>}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#22c55e', whiteSpace: 'nowrap' }}>{fmt(c.valor)}</td>
                            <td style={{ padding: '10px 14px', color: C.muted, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{c.tipo}</td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              <Badge status={vencida ? 'vencido' : c.status} />
                            </td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {c.status === 'pendente' && (
                                  <button onClick={() => { setModalPagar(c); setFormPagar({ pago_em: hoje.toISOString().split('T')[0], pago_valor: String(c.valor), forma_pagamento: 'pix', observacoes: '' }) }}
                                    style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)', color: '#22c55e', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>
                                    Registrar pago
                                  </button>
                                )}
                                {!['pago', 'cancelado'].includes(c.status) && (
                                  <button onClick={() => handleCancelar(c.id)}
                                    style={{ fontSize: 11, padding: '4px 8px', background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, borderRadius: 5, cursor: 'pointer' }}>
                                    Cancelar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════ PREVISÃO ═══════════════════════ */}
          {aba === 'previsao' && (
            <div>
              <div style={{ ...cardBox, marginBottom: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>Projeção de receita</p>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 20px' }}>
                  Baseado no MRR atual de {fmt(mrr)}, assumindo crescimento zero (cenário conservador).
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  {[0, 1, 2].map(offset => {
                    const d = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1)
                    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                    return (
                      <div key={offset} style={{ background: C.card, borderRadius: 10, padding: '16px', border: `1px solid ${offset === 0 ? '#7c3aed' : C.border}` }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>
                          {label} {offset === 0 && <span style={{ color: '#a78bfa', fontWeight: 700 }}>· Atual</span>}
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#22c55e' }}>{fmt(mrr)}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>MRR projetado</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ ...cardBox }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>ARR projetado</p>
                  <p style={{ fontSize: 30, fontWeight: 800, color: '#3b82f6', margin: '8px 0 4px' }}>{fmt(arr)}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Receita anual recorrente com base no MRR atual</p>
                </div>
                <div style={{ background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 10, padding: '18px 20px' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <i className="ti ti-bulb" style={{ fontSize: 15 }} aria-hidden="true" /> Para melhorar a previsão
                  </p>
                  <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.7 }}>
                    Registre as cobranças mensais na aba Cobranças e marque como pagas quando receber. Isso permitirá análises mais precisas de churn, receita real e fluxo de caixa futuro.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ Modal registrar pagamento ══════════════════════════ */}
      {modalPagar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Registrar pagamento</span>
              <button onClick={() => setModalPagar(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ background: C.card, borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 3px' }}>{(modalPagar.corretora as { nome?: string } | undefined)?.nome}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{modalPagar.descricao} · {fmt(modalPagar.valor)}</p>
              </div>
              {([['Data do pagamento', 'pago_em', 'date'], ['Valor pago (R$)', 'pago_valor', 'number']] as [string, string, string][]).map(([l, k, t]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <label style={lbl}>{l}</label>
                  <input type={t} value={(formPagar as Record<string, string>)[k]} onChange={e => setFormPagar(p => ({ ...p, [k]: e.target.value }))} style={inp} />
                </div>
              ))}
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Forma de pagamento</label>
                <select value={formPagar.forma_pagamento} onChange={e => setFormPagar(p => ({ ...p, forma_pagamento: e.target.value }))} style={inp}>
                  {['pix', 'boleto', 'cartao', 'transferencia', 'dinheiro'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Observações</label>
                <input value={formPagar.observacoes} onChange={e => setFormPagar(p => ({ ...p, observacoes: e.target.value }))} placeholder="Opcional" style={inp} />
              </div>
              <button onClick={handlePagar} disabled={salvando}
                style={{ width: '100%', padding: 11, background: '#22c55e', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {salvando ? 'Salvando...' : '✓ Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal nova cobrança ════════════════════════════════ */}
      {modalNova && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, width: '100%', maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Nova cobrança</span>
              <button onClick={() => setModalNova(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Corretora *</label>
                  <select value={formNova.corretora_id} onChange={e => setFormNova(p => ({ ...p, corretora_id: e.target.value }))} style={inp}>
                    <option value="">Selecione...</option>
                    {corretoras.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Descrição *</label>
                  <input value={formNova.descricao} onChange={e => setFormNova(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Mensalidade 07/2026" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Valor (R$) *</label>
                  <input type="number" value={formNova.valor} onChange={e => setFormNova(p => ({ ...p, valor: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Vencimento *</label>
                  <input type="date" value={formNova.vencimento} onChange={e => setFormNova(p => ({ ...p, vencimento: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Tipo</label>
                  <select value={formNova.tipo} onChange={e => setFormNova(p => ({ ...p, tipo: e.target.value }))} style={inp}>
                    {['mensalidade', 'avulso', 'setup', 'multa'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Mês referência</label>
                  <input type="month" value={formNova.mes_referencia} onChange={e => setFormNova(p => ({ ...p, mes_referencia: e.target.value }))} style={inp} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Observações</label>
                  <input value={formNova.observacoes} onChange={e => setFormNova(p => ({ ...p, observacoes: e.target.value }))} placeholder="Opcional" style={inp} />
                </div>
              </div>
              <button onClick={handleNova} disabled={salvando || !formNova.corretora_id || !formNova.valor || !formNova.vencimento}
                style={{ width: '100%', padding: 11, background: '#7c3aed', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 14, opacity: (!formNova.corretora_id || !formNova.valor || !formNova.vencimento) ? .5 : 1 }}>
                {salvando ? 'Criando...' : 'Criar cobrança'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
