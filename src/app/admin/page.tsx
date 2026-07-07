'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Corretora {
  id: string; nome: string; plano_assinatura: string
  status_assinatura: string; bloqueada: boolean
  total_cotacoes: number; cotacoes_mes_atual: number
  total_membros: number; criado_em: string
  ultima_cotacao_em: string | null
}

interface CotacaoDetalhe {
  id: string; status: string; ramo: string | null
  razao_social: string | null; criado_em: string
  corretora_id: string; corretora_nome?: string
}

interface MetricasGlobais {
  total_corretoras: number
  corretoras_ativas: number
  corretoras_bloqueadas: number
  total_usuarios: number
  total_cotacoes: number
  cotacoes_mes: number
  por_status: Record<string, number>
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  rascunho:       { label: 'Rascunho',    bg: '#21262d', text: '#8b949e', icon: 'ti-file' },
  em_analise:     { label: 'Em análise',  bg: '#2d1a00', text: '#f59e0b', icon: 'ti-search' },
  pendente_dados: { label: 'Pendente',    bg: '#2d0e0e', text: '#f85149', icon: 'ti-clock' },
  aprovada:       { label: 'Aprovada',    bg: '#0d2b1a', text: '#3fb950', icon: 'ti-circle-check' },
  enviada:        { label: 'Enviada',     bg: '#0d1f3c', text: '#58a6ff', icon: 'ti-send' },
  arquivada:      { label: 'Arquivada',   bg: '#21262d', text: '#484f58', icon: 'ti-archive' },
}

const PLANO_CORES: Record<string, { bg: string; text: string }> = {
  trial:        { bg: '#21262d', text: '#8b949e' },
  basico:       { bg: '#0d1f3c', text: '#58a6ff' },
  profissional: { bg: '#1a0f3c', text: '#a78bfa' },
  enterprise:   { bg: '#2d1a00', text: '#f59e0b' },
}

export default function AdminDashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createClient() as any
  const [corretoras, setCorretoras] = useState<Corretora[]>([])
  const [cotacoes, setCotacoes] = useState<CotacaoDetalhe[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroCorretora, setFiltroCorretora] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [abaSelecionada, setAbaSelecionada] = useState<'visao_geral' | 'cotacoes' | 'corretoras'>('visao_geral')

  useEffect(() => {
    async function carregar() {
      const [corrRes, cotRes] = await Promise.all([
        sb.from('vw_metricas_corretoras').select('*').order('criado_em', { ascending: false }),
        sb.from('cotacoes').select('id, status, ramo, razao_social, criado_em, corretora_id').order('criado_em', { ascending: false }).limit(500),
      ])
      const lista = (corrRes.data ?? []) as Corretora[]
      const cots = (cotRes.data ?? []) as CotacaoDetalhe[]
      // Enriquece cotações com nome da corretora
      const corMap = Object.fromEntries(lista.map(c => [c.id, c.nome]))
      setCotacoes(cots.map(c => ({ ...c, corretora_nome: corMap[c.corretora_id] ?? '—' })))
      setCorretoras(lista)
      setCarregando(false)
    }
    carregar()
  }, [])

  const cotacoesFiltradas = useMemo(() => {
    return cotacoes.filter(c => {
      const passaCorretora = filtroCorretora === 'todas' || c.corretora_id === filtroCorretora
      const passaStatus = filtroStatus === 'todos' || c.status === filtroStatus
      return passaCorretora && passaStatus
    })
  }, [cotacoes, filtroCorretora, filtroStatus])

  const metricas = useMemo((): MetricasGlobais => {
    const base = filtroCorretora === 'todas' ? cotacoes : cotacoes.filter(c => c.corretora_id === filtroCorretora)
    const agora = new Date()
    const porStatus: Record<string, number> = {}
    base.forEach(c => { porStatus[c.status] = (porStatus[c.status] ?? 0) + 1 })
    const corrFiltradas = filtroCorretora === 'todas' ? corretoras : corretoras.filter(c => c.id === filtroCorretora)
    return {
      total_corretoras: corretoras.length,
      corretoras_ativas: corretoras.filter(c => c.status_assinatura === 'ativa' && !c.bloqueada).length,
      corretoras_bloqueadas: corretoras.filter(c => c.bloqueada).length,
      total_usuarios: corrFiltradas.reduce((s, c) => s + (c.total_membros ?? 0), 0),
      total_cotacoes: base.length,
      cotacoes_mes: base.filter(c => {
        const d = new Date(c.criado_em)
        return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear()
      }).length,
      por_status: porStatus,
    }
  }, [cotacoes, corretoras, filtroCorretora])

  const corrSel = filtroCorretora !== 'todas' ? corretoras.find(c => c.id === filtroCorretora) : null

  // Estilos base
  const card = (extra?: React.CSSProperties) => ({
    background: '#161b22', border: '1px solid #30363d', borderRadius: 10, ...extra
  })
  const txt1 = { color: '#e6edf3' }
  const txt2 = { color: '#8b949e' }
  const txt3 = { color: '#484f58' }
  const inp = { background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 12, padding: '7px 10px', outline: 'none' }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 600, ...txt1, margin: 0 }}>Visão geral do sistema</h1>
          <p style={{ fontSize: 12, ...txt2, marginTop: 4 }}>
            {filtroCorretora === 'todas'
              ? `${corretoras.length} corretoras · ${cotacoes.length} cotações no total`
              : `Filtrando: ${corrSel?.nome ?? '...'}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Filtro corretora */}
          <select value={filtroCorretora} onChange={e => setFiltroCorretora(e.target.value)} style={{ ...inp, minWidth: 200 }}>
            <option value="todas">Todas as corretoras</option>
            {corretoras.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          {filtroCorretora !== 'todas' && (
            <button onClick={() => setFiltroCorretora('todas')}
              style={{ padding: '7px 10px', background: 'none', border: '1px solid #30363d', borderRadius: 6, color: '#8b949e', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-x" style={{ fontSize: 12 }} /> Limpar filtro
            </button>
          )}
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {([
          { id: 'visao_geral', label: 'Visão geral', icon: 'ti-layout-dashboard' },
          { id: 'cotacoes', label: 'Cotações', icon: 'ti-file-text' },
          { id: 'corretoras', label: 'Corretoras', icon: 'ti-building' },
        ] as const).map(a => (
          <button key={a.id} onClick={() => setAbaSelecionada(a.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: abaSelecionada === a.id ? 500 : 400, background: abaSelecionada === a.id ? '#0d1117' : 'transparent', color: abaSelecionada === a.id ? '#e6edf3' : '#8b949e', transition: 'all .15s' }}>
            <i className={`ti ${a.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
            {a.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <div style={{ textAlign: 'center', padding: 60, ...txt2, fontSize: 13 }}>Carregando dados do sistema...</div>
      ) : (
        <>
          {/* ── ABA VISÃO GERAL ── */}
          {abaSelecionada === 'visao_geral' && (
            <div>
              {/* Cards de métricas globais (sempre visíveis) */}
              {filtroCorretora === 'todas' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Corretoras ativas', value: metricas.corretoras_ativas, icon: 'ti-building', cor: '#58a6ff' },
                    { label: 'Bloqueadas', value: metricas.corretoras_bloqueadas, icon: 'ti-lock', cor: '#f85149' },
                    { label: 'Total usuários', value: metricas.total_usuarios, icon: 'ti-users', cor: '#3fb950' },
                    { label: 'Total cotações', value: metricas.total_cotacoes, icon: 'ti-file-text', cor: '#a78bfa' },
                    { label: 'Cotações este mês', value: metricas.cotacoes_mes, icon: 'ti-calendar', cor: '#f59e0b' },
                  ].map(m => (
                    <div key={m.label} style={{ ...card(), padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <i className={`ti ${m.icon}`} style={{ fontSize: 14, color: m.cor }} aria-hidden="true" />
                        <span style={{ fontSize: 10, ...txt2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>{m.label}</span>
                      </div>
                      <p style={{ fontSize: 24, fontWeight: 600, ...txt1, margin: 0 }}>{m.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Status das cotações */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, ...txt3, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>
                  Cotações por status {filtroCorretora !== 'todas' ? `— ${corrSel?.nome}` : ''}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const qtd = metricas.por_status[key] ?? 0
                    const pct = metricas.total_cotacoes > 0 ? Math.round((qtd / metricas.total_cotacoes) * 100) : 0
                    return (
                      <button key={key} onClick={() => { setFiltroStatus(key); setAbaSelecionada('cotacoes') }}
                        style={{ ...card(), padding: '12px 14px', textAlign: 'left', cursor: 'pointer', border: `1px solid ${filtroStatus === key ? cfg.text : '#30363d'}`, transition: 'border .15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <i className={`ti ${cfg.icon}`} style={{ fontSize: 13, color: cfg.text }} aria-hidden="true" />
                          <span style={{ fontSize: 10, color: cfg.text, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>{cfg.label}</span>
                        </div>
                        <p style={{ fontSize: 22, fontWeight: 600, ...txt1, margin: '0 0 4px' }}>{qtd}</p>
                        <div style={{ height: 3, background: '#21262d', borderRadius: 2 }}>
                          <div style={{ height: 3, background: cfg.text, borderRadius: 2, width: `${pct}%`, opacity: .7, transition: 'width .3s' }} />
                        </div>
                        <p style={{ fontSize: 10, ...txt3, margin: '3px 0 0' }}>{pct}% do total</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Últimas cotações */}
              <div style={card({ overflow: 'hidden' })}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #30363d' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, ...txt1 }}>Últimas cotações</span>
                  <button onClick={() => setAbaSelecionada('cotacoes')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#58a6ff' }}>
                    Ver todas →
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #21262d', background: '#0d1117' }}>
                      {['Empresa', 'Corretora', 'Ramo', 'Status', 'Data'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, ...txt2, textTransform: 'uppercase', letterSpacing: '.4px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cotacoesFiltradas.slice(0, 8).map(c => {
                      const s = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.rascunho
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid #21262d', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1c2330')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 500, ...txt1 }}>{c.razao_social ?? '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11, ...txt2 }}>{c.corretora_nome}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11, ...txt2 }}>{c.ramo ?? '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ background: s.bg, color: s.text, padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500 }}>{s.label}</span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 11, ...txt3 }}>{new Date(c.criado_em).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ABA COTAÇÕES ── */}
          {abaSelecionada === 'cotacoes' && (
            <div>
              {/* Filtro de status inline */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                <button onClick={() => setFiltroStatus('todos')}
                  style={{ padding: '5px 12px', borderRadius: 5, border: `1px solid ${filtroStatus === 'todos' ? '#e6edf3' : '#30363d'}`, background: filtroStatus === 'todos' ? '#21262d' : 'transparent', color: filtroStatus === 'todos' ? '#e6edf3' : '#8b949e', fontSize: 12, cursor: 'pointer' }}>
                  Todos ({metricas.total_cotacoes})
                </button>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button key={key} onClick={() => setFiltroStatus(key)}
                    style={{ padding: '5px 12px', borderRadius: 5, border: `1px solid ${filtroStatus === key ? cfg.text : '#30363d'}`, background: filtroStatus === key ? cfg.bg : 'transparent', color: filtroStatus === key ? cfg.text : '#8b949e', fontSize: 12, cursor: 'pointer' }}>
                    {cfg.label} ({metricas.por_status[key] ?? 0})
                  </button>
                ))}
              </div>

              <div style={card({ overflow: 'hidden' })}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #30363d', fontSize: 12, ...txt2 }}>
                  {cotacoesFiltradas.length} cotaç{cotacoesFiltradas.length !== 1 ? 'ões' : 'ão'} encontrada{cotacoesFiltradas.length !== 1 ? 's' : ''}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #21262d', background: '#0d1117' }}>
                        {['Empresa', 'CNPJ', 'Corretora', 'Ramo', 'Status', 'Data'].map(h => (
                          <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, ...txt2, textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cotacoesFiltradas.slice(0, 100).map(c => {
                        const s = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.rascunho
                        return (
                          <tr key={c.id} style={{ borderBottom: '1px solid #21262d' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#1c2330')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 500, ...txt1, whiteSpace: 'nowrap' }}>{c.razao_social ?? '—'}</td>
                            <td style={{ padding: '10px 14px', fontSize: 11, ...txt3, whiteSpace: 'nowrap' }}>—</td>
                            <td style={{ padding: '10px 14px', fontSize: 11, ...txt2, whiteSpace: 'nowrap' }}>{c.corretora_nome}</td>
                            <td style={{ padding: '10px 14px', fontSize: 11, ...txt2, whiteSpace: 'nowrap' }}>{c.ramo ?? '—'}</td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{ background: s.bg, color: s.text, padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500 }}>{s.label}</span>
                            </td>
                            <td style={{ padding: '10px 14px', fontSize: 11, ...txt3, whiteSpace: 'nowrap' }}>{new Date(c.criado_em).toLocaleDateString('pt-BR')}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {cotacoesFiltradas.length > 100 && (
                    <p style={{ padding: '10px 14px', fontSize: 11, ...txt3, textAlign: 'center' }}>
                      Mostrando 100 de {cotacoesFiltradas.length}. Use o filtro de corretora para refinar.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── ABA CORRETORAS ── */}
          {abaSelecionada === 'corretoras' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Total cadastradas', value: corretoras.length, cor: '#58a6ff' },
                  { label: 'Ativas', value: metricas.corretoras_ativas, cor: '#3fb950' },
                  { label: 'Em trial', value: corretoras.filter(c => c.plano_assinatura === 'trial').length, cor: '#f59e0b' },
                  { label: 'Bloqueadas', value: metricas.corretoras_bloqueadas, cor: '#f85149' },
                ].map(m => (
                  <div key={m.label} style={{ ...card(), padding: '14px 16px' }}>
                    <p style={{ fontSize: 10, ...txt2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', margin: '0 0 8px' }}>{m.label}</p>
                    <p style={{ fontSize: 26, fontWeight: 600, color: m.cor, margin: 0 }}>{m.value}</p>
                  </div>
                ))}
              </div>

              <div style={card({ overflow: 'hidden' })}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #21262d', background: '#0d1117' }}>
                      {['Corretora', 'Plano', 'Usuários', 'Cotações', 'Este mês', 'Última cotação', 'Status', ''].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, ...txt2, textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {corretoras.map(c => {
                      const plano = PLANO_CORES[c.plano_assinatura] ?? PLANO_CORES.trial
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid #21262d', cursor: 'pointer' }}
                          onClick={() => { setFiltroCorretora(c.id); setAbaSelecionada('visao_geral') }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1c2330')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {c.bloqueada && <i className="ti ti-lock" style={{ fontSize: 12, color: '#f85149', flexShrink: 0 }} aria-hidden="true" />}
                              <span style={{ fontSize: 13, fontWeight: 500, ...txt1 }}>{c.nome}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ background: plano.bg, color: plano.text, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500, textTransform: 'capitalize' }}>{c.plano_assinatura}</span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, ...txt2 }}>{c.total_membros ?? 0}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, ...txt2 }}>{c.total_cotacoes ?? 0}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, ...txt2 }}>{c.cotacoes_mes_atual ?? 0}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11, ...txt3 }}>
                            {c.ultima_cotacao_em ? new Date(c.ultima_cotacao_em).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              background: c.bloqueada ? '#2d0e0e' : c.status_assinatura === 'ativa' ? '#0d2b1a' : '#21262d',
                              color: c.bloqueada ? '#f85149' : c.status_assinatura === 'ativa' ? '#3fb950' : '#8b949e',
                              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500,
                            }}>
                              {c.bloqueada ? 'Bloqueada' : c.status_assinatura}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Link href={`/admin/corretoras/${c.id}`} onClick={e => e.stopPropagation()}
                              style={{ fontSize: 11, color: '#58a6ff', textDecoration: 'none' }}>
                              Gerir →
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
