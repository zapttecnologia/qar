'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Corretora {
  id: string; nome: string; plano_assinatura: string; status_assinatura: string
  bloqueada: boolean; suspenso: boolean; total_cotacoes: number
  cotacoes_mes_atual: number; total_membros: number; criado_em: string
  valor_pendente: number; receita_ano: number; cobrancas_vencidas: number
}
interface Cobranca {
  id: string; descricao: string; valor: number; vencimento: string
  status: string; tipo: string; corretora_id: string; corretora_nome?: string
}

const dk = {
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 10 } as React.CSSProperties,
  t1: { color: '#e6edf3' }, t2: { color: '#8b949e' }, t3: { color: '#484f58' },
  inp: { background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 12, padding: '7px 10px', outline: 'none' } as React.CSSProperties,
}
const STATUS_COB: Record<string, {bg:string;text:string}> = {
  pendente: {bg:'#2d1a00',text:'#f59e0b'}, pago: {bg:'#0d2b1a',text:'#3fb950'},
  vencido: {bg:'#2d0e0e',text:'#f85149'}, cancelado: {bg:'#21262d',text:'#484f58'},
}

export default function AdminDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createClient() as any
  const [corretoras, setCorretoras] = useState<Corretora[]>([])
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroPlano, setFiltroPlano] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    Promise.all([
      sb.from('vw_metricas_corretoras').select('*').order('criado_em', { ascending: false }),
      sb.from('cobrancas').select('*, corretora:corretoras(nome)').order('vencimento').limit(200),
    ]).then(([c, cb]: [{data: Corretora[]}, {data: Cobranca[]}]) => {
      setCorretoras(c.data ?? [])
      const cbData = (cb.data ?? []).map((x: Cobranca & {corretora?: {nome: string}}) => ({
        ...x, corretora_nome: (x.corretora as {nome?: string} | undefined)?.nome ?? '—'
      }))
      setCobrancas(cbData)
      setCarregando(false)
    })
  }, [])

  const corrFiltradas = useMemo(() => {
    return corretoras.filter(c => {
      const pb = filtroPlano === 'todos' || c.plano_assinatura === filtroPlano
      const sb2 = filtroStatus === 'todos' || (filtroStatus === 'bloqueada' ? c.bloqueada : filtroStatus === 'suspenso' ? c.suspenso : c.status_assinatura === filtroStatus)
      const bb = !busca || c.nome.toLowerCase().includes(busca.toLowerCase())
      return pb && sb2 && bb
    })
  }, [corretoras, filtroPlano, filtroStatus, busca])

  const metricas = useMemo(() => ({
    total: corretoras.length,
    ativas: corretoras.filter(c => c.status_assinatura === 'ativa' && !c.bloqueada && !c.suspenso).length,
    suspensas: corretoras.filter(c => c.suspenso).length,
    bloqueadas: corretoras.filter(c => c.bloqueada).length,
    totalUsuarios: corretoras.reduce((s, c) => s + (c.total_membros ?? 0), 0),
    totalCotacoes: corretoras.reduce((s, c) => s + (c.total_cotacoes ?? 0), 0),
    cotacoesMes: corretoras.reduce((s, c) => s + (c.cotacoes_mes_atual ?? 0), 0),
    receitaAno: corretoras.reduce((s, c) => s + (c.receita_ano ?? 0), 0),
    pendente: cobrancas.filter(c => c.status === 'pendente').reduce((s, c) => s + c.valor, 0),
    vencidas: cobrancas.filter(c => c.status === 'vencido').length,
  }), [corretoras, cobrancas])

  const card = (label: string, value: string|number, icon: string, cor: string, href?: string) => (
    <div key={label} style={{ ...dk.card, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 14, color: cor }} aria-hidden="true" />
        <span style={{ fontSize: 10, ...dk.t2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</span>
      </div>
      <p style={{ fontSize: 24, fontWeight: 600, ...dk.t1, margin: '0 0 4px' }}>{value}</p>
      {href && <Link href={href} style={{ fontSize: 11, color: cor, textDecoration: 'none' }}>Ver detalhes →</Link>}
    </div>
  )

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 600, ...dk.t1, margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 12, ...dk.t2, marginTop: 4 }}>Visão macro do sistema · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <Link href="/admin/corretoras/nova"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: '#7c3aed', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
          <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" /> Nova corretora
        </Link>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
        {card('Corretoras ativas', metricas.ativas, 'ti-building', '#3fb950', '/admin/corretoras?status=ativa')}
        {card('Suspensas', metricas.suspensas, 'ti-pause-circle', '#f59e0b', '/admin/corretoras?status=suspenso')}
        {card('Bloqueadas', metricas.bloqueadas, 'ti-lock', '#f85149', '/admin/corretoras?status=bloqueada')}
        {card('Total usuários', metricas.totalUsuarios, 'ti-users', '#58a6ff')}
        {card('Cotações totais', metricas.totalCotacoes, 'ti-file-text', '#a78bfa')}
        {card('Cotações este mês', metricas.cotacoesMes, 'ti-calendar', '#f59e0b')}
        {card('Receita no ano', `R$ ${metricas.receitaAno.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, 'ti-coin', '#3fb950', '/admin/financeiro')}
        {card('A receber', `R$ ${metricas.pendente.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, 'ti-clock', '#f59e0b', '/admin/financeiro')}
        {metricas.vencidas > 0 ? card('Cobranças vencidas', metricas.vencidas, 'ti-alert-triangle', '#f85149', '/admin/financeiro') : card('Total corretoras', metricas.total, 'ti-building-community', '#58a6ff')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        {/* Corretoras */}
        <div style={dk.card}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #30363d' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, ...dk.t1 }}>Corretoras</span>
              <Link href="/admin/corretoras" style={{ fontSize: 11, color: '#58a6ff', textDecoration: 'none' }}>Ver todas →</Link>
            </div>
            {/* Filtros */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." style={{ ...dk.inp, flex: 1, minWidth: 120 }} />
              <select value={filtroPlano} onChange={e => setFiltroPlano(e.target.value)} style={dk.inp}>
                <option value="todos">Todos os planos</option>
                {['trial','basico','profissional','enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={dk.inp}>
                <option value="todos">Todos os status</option>
                <option value="ativa">Ativas</option>
                <option value="suspenso">Suspensas</option>
                <option value="bloqueada">Bloqueadas</option>
                <option value="inadimplente">Inadimplentes</option>
              </select>
            </div>
          </div>

          {carregando ? <div style={{ padding: 30, textAlign: 'center', ...dk.t2, fontSize: 13 }}>Carregando...</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0d1117' }}>
                    {['Corretora','Plano','Usuários','Cotações','Status',''].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, ...dk.t2, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #21262d', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {corrFiltradas.slice(0,15).map(c => {
                    const statusLabel = c.bloqueada ? 'Bloqueada' : c.suspenso ? 'Suspensa' : c.status_assinatura
                    const statusCor = c.bloqueada ? '#f85149' : c.suspenso ? '#f59e0b' : c.status_assinatura === 'ativa' ? '#3fb950' : '#8b949e'
                    const statusBg = c.bloqueada ? '#2d0e0e' : c.suspenso ? '#2d1a00' : c.status_assinatura === 'ativa' ? '#0d2b1a' : '#21262d'
                    const planoCor: Record<string,string> = { trial:'#8b949e', basico:'#58a6ff', profissional:'#a78bfa', enterprise:'#f59e0b' }
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #21262d', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1c2330')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        onClick={() => window.location.href = `/admin/corretoras/${c.id}`}>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, ...dk.t1 }}>{c.nome}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: `${planoCor[c.plano_assinatura] ?? '#8b949e'}18`, color: planoCor[c.plano_assinatura] ?? '#8b949e', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500, textTransform: 'capitalize' }}>{c.plano_assinatura}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, ...dk.t2 }}>{c.total_membros ?? 0}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, ...dk.t2 }}>{c.total_cotacoes ?? 0}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: statusBg, color: statusCor, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500, textTransform: 'capitalize' }}>{statusLabel}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Link href={`/admin/corretoras/${c.id}`} onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: '#58a6ff', textDecoration: 'none' }}>Editar →</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {corrFiltradas.length > 15 && (
                <p style={{ padding: '8px 14px', fontSize: 11, ...dk.t3, textAlign: 'center' }}>
                  Mostrando 15 de {corrFiltradas.length} · <Link href="/admin/corretoras" style={{ color: '#58a6ff', textDecoration: 'none' }}>Ver todas</Link>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Cobranças recentes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={dk.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #30363d' }}>
              <span style={{ fontSize: 13, fontWeight: 600, ...dk.t1 }}>Cobranças recentes</span>
              <Link href="/admin/financeiro" style={{ fontSize: 11, color: '#58a6ff', textDecoration: 'none' }}>Financeiro →</Link>
            </div>
            {cobrancas.slice(0, 8).map(cb => {
              const st = STATUS_COB[cb.status] ?? STATUS_COB.cancelado
              return (
                <div key={cb.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #21262d' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, ...dk.t1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cb.corretora_nome}</p>
                    <p style={{ fontSize: 11, ...dk.t2, margin: '2px 0 0' }}>{new Date(cb.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')} · {cb.tipo}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: st.text, margin: 0 }}>R$ {Number(cb.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <span style={{ background: st.bg, color: st.text, padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 500 }}>{cb.status}</span>
                  </div>
                </div>
              )
            })}
            {cobrancas.length === 0 && <p style={{ padding: 20, textAlign: 'center', fontSize: 12, ...dk.t2 }}>Nenhuma cobrança ainda.</p>}
          </div>

          {/* Alertas */}
          {(metricas.vencidas > 0 || metricas.bloqueadas > 0) && (
            <div style={dk.card}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #30363d' }}>
                <span style={{ fontSize: 13, fontWeight: 600, ...dk.t1 }}>Alertas</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {metricas.vencidas > 0 && (
                  <Link href="/admin/financeiro?status=vencido" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', textDecoration: 'none', borderBottom: '1px solid #21262d' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#2d0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: 15, color: '#f85149' }} aria-hidden="true" />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#f85149', margin: 0 }}>{metricas.vencidas} cobranças vencidas</p>
                      <p style={{ fontSize: 11, ...dk.t2, margin: '2px 0 0' }}>Requer ação imediata</p>
                    </div>
                  </Link>
                )}
                {metricas.bloqueadas > 0 && (
                  <Link href="/admin/corretoras?status=bloqueada" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', textDecoration: 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#2d0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="ti ti-lock" style={{ fontSize: 15, color: '#f85149' }} aria-hidden="true" />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#f85149', margin: 0 }}>{metricas.bloqueadas} corretoras bloqueadas</p>
                      <p style={{ fontSize: 11, ...dk.t2, margin: '2px 0 0' }}>Verificar situação</p>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
