'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Corretora {
  id: string; nome: string; cnpj: string | null
  plano_assinatura: string; plano_valor: number | null
  status_assinatura: string; bloqueada: boolean; suspenso: boolean
  total_cotacoes: number; total_membros: number; cotacoes_mes_atual: number
  cidade: string | null; uf: string | null
}

const PLANO_CORES: Record<string, { bg: string; text: string }> = {
  trial:        { bg: '#21262d', text: '#8b949e' },
  basico:       { bg: '#0d1f3c', text: '#58a6ff' },
  profissional: { bg: '#1a0f3c', text: '#a78bfa' },
  enterprise:   { bg: '#2d1a00', text: '#f59e0b' },
}

export default function AdminCorretorasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filtroUrl = searchParams.get('status') ?? 'todas'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const [corretoras, setCorretoras] = useState<Corretora[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    setBusca('')
    supabase.from('vw_metricas_corretoras').select('*').order('criado_em', { ascending: false })
      .then(({ data }: { data: Corretora[] }) => {
        setCorretoras(data ?? [])
        setCarregando(false)
      })
  }, [])

  const filtradas = useMemo(() => {
    return corretoras.filter(c => {
      // Filtro de status via URL
      const passaStatus = (() => {
        switch (filtroUrl) {
          case 'ativa':     return c.status_assinatura === 'ativa' && !c.bloqueada && !c.suspenso
          case 'suspenso':  return c.suspenso === true
          case 'bloqueada': return c.bloqueada === true
          default:          return true // 'todas'
        }
      })()
      // Filtro de busca
      const passaBusca = !busca ||
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (c.cnpj ?? '').includes(busca)
      return passaStatus && passaBusca
    })
  }, [corretoras, filtroUrl, busca])

  const TITULO: Record<string, string> = {
    todas:    'Todas as corretoras',
    ativa:    'Corretoras ativas',
    suspenso: 'Corretoras suspensas',
    bloqueada:'Corretoras bloqueadas',
  }

  const CONTAGEM = {
    todas:    corretoras.length,
    ativa:    corretoras.filter(c => c.status_assinatura === 'ativa' && !c.bloqueada && !c.suspenso).length,
    suspenso: corretoras.filter(c => c.suspenso).length,
    bloqueada:corretoras.filter(c => c.bloqueada).length,
  }

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3' }}>
            {TITULO[filtroUrl] ?? 'Corretoras'}
          </h1>
          <p style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>
            {carregando ? 'Carregando...' : `${filtradas.length} corretora${filtradas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link href="/admin/corretoras/nova"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#7c3aed', color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
          Nova corretora
        </Link>
      </div>

      {/* Tabs de filtro rápido */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {(['todas','ativa','suspenso','bloqueada'] as const).map(st => (
          <Link key={st} href={st === 'todas' ? '/admin/corretoras' : `/admin/corretoras?status=${st}`}
            style={{
              padding: '5px 12px', borderRadius: 5, fontSize: 12, fontWeight: 500,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5,
              border: `1px solid ${filtroUrl === st ? '#7c3aed' : '#30363d'}`,
              background: filtroUrl === st ? 'rgba(124,58,237,.15)' : 'transparent',
              color: filtroUrl === st ? '#a78bfa' : '#8b949e',
            }}>
            {st === 'todas' && <i className="ti ti-building-community" style={{ fontSize: 12 }} aria-hidden="true" />}
            {st === 'ativa' && <i className="ti ti-circle-check" style={{ fontSize: 12 }} aria-hidden="true" />}
            {st === 'suspenso' && <i className="ti ti-pause-circle" style={{ fontSize: 12 }} aria-hidden="true" />}
            {st === 'bloqueada' && <i className="ti ti-lock" style={{ fontSize: 12 }} aria-hidden="true" />}
            {st.charAt(0).toUpperCase() + st.slice(1)}
            <span style={{ background: 'rgba(255,255,255,.08)', borderRadius: 3, padding: '0 5px', fontSize: 11 }}>
              {CONTAGEM[st]}
            </span>
          </Link>
        ))}
      </div>

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou CNPJ..."
          style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: '#161b22', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* Tabela */}
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, overflow: 'hidden' }}>
        {carregando ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: '#8b949e' }}>Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <i className="ti ti-building-off" style={{ fontSize: 32, color: '#30363d', display: 'block', marginBottom: 12 }} aria-hidden="true" />
            <p style={{ fontSize: 13, color: '#8b949e', margin: 0 }}>
              Nenhuma corretora {filtroUrl !== 'todas' ? `${TITULO[filtroUrl]?.toLowerCase().replace('corretoras ', '')}` : ''} encontrada.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #30363d', background: '#0d1117' }}>
                {['Corretora','Cidade/UF','Plano','Valor/mês','Membros','Cotações','Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(c => {
                const plano = PLANO_CORES[c.plano_assinatura] ?? PLANO_CORES.trial
                const statusLabel = c.bloqueada ? 'Bloqueada' : c.suspenso ? 'Suspensa' : c.status_assinatura
                const statusBg = c.bloqueada ? '#2d0e0e' : c.suspenso ? '#2d1a00' : c.status_assinatura === 'ativa' ? '#0d2b1a' : '#21262d'
                const statusColor = c.bloqueada ? '#f85149' : c.suspenso ? '#f59e0b' : c.status_assinatura === 'ativa' ? '#3fb950' : '#8b949e'
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #21262d', cursor: 'pointer' }}
                    onClick={() => router.push(`/admin/corretoras/${c.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1c2330')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: '#1a0f3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#a78bfa', flexShrink: 0 }}>
                          {c.nome.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, color: '#e6edf3', fontSize: 13 }}>{c.nome}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8b949e', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {c.cidade && c.uf ? `${c.cidade} / ${c.uf}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: plano.bg, color: plano.text, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, textTransform: 'capitalize' }}>
                        {c.plano_assinatura}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8b949e', fontSize: 12 }}>
                      {c.plano_valor ? `R$ ${Number(c.plano_valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8b949e', fontSize: 13, textAlign: 'center' }}>{c.total_membros ?? 0}</td>
                    <td style={{ padding: '12px 16px', color: '#8b949e', fontSize: 13, textAlign: 'center' }}>{c.total_cotacoes ?? 0}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: statusBg, color: statusColor, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {filtradas.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #21262d', fontSize: 11, color: '#8b949e', textAlign: 'right' }}>
            {filtradas.length} de {corretoras.length} corretoras
          </div>
        )}
      </div>
    </div>
  )
}
