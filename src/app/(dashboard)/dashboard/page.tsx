'use client'

export const dynamic = 'force-dynamic'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useSessao } from '@/hooks/useSessao'
import { useCotacoes } from '@/hooks/useCotacoes'
import { BannerCotacoes } from '@/components/plano/BannerCotacoes'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, formatCNPJ } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', em_analise: 'Em análise', pendente_dados: 'Pendente',
  aprovada: 'Aprovada', enviada: 'Enviada', arquivada: 'Arquivada',
}

export default function DashboardPage() {
  const { corretora, usuario } = useSessao()
  const supabase = createClient()

  const { data: metricas } = useQuery({
    queryKey: ['metricas', corretora?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('cotacoes')
        .select('status, criado_em')
        .eq('corretora_id', corretora!.id)
      const rows = (data ?? []) as Array<{ status: string; criado_em: string }>
      const total = rows.length
      const em_aberto = rows.filter(c => ['rascunho','em_analise','pendente_dados'].includes(c.status)).length
      const enviadas = rows.filter(c => c.status === 'enviada').length
      const aprovadas = rows.filter(c => c.status === 'aprovada').length
      const agora = new Date()
      const mes_atual = rows.filter(c => {
        const d = new Date(c.criado_em)
        return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear()
      }).length
      return { total, em_aberto, enviadas, aprovadas, mes_atual, taxa: total > 0 ? Math.round((aprovadas / total) * 100) : 0 }
    },
    enabled: !!corretora?.id,
  })

  const { data: ultimasCotacoes } = useQuery({
    queryKey: ['ultimas-cotacoes', corretora?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('cotacoes')
        .select('id, razao_social, cnpj, ramo, status, criado_em, importancia_segurada')
        .eq('corretora_id', corretora!.id)
        .order('criado_em', { ascending: false })
        .limit(5)
      return data ?? []
    },
    enabled: !!corretora?.id,
  })

  const { data: ultimosClientes } = useQuery({
    queryKey: ['ultimos-clientes', corretora?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('clientes')
        .select('id, razao_social, cnpj, cidade_uf, criado_em')
        .eq('corretora_id', corretora!.id)
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
        .limit(5)
      return data ?? []
    },
    enabled: !!corretora?.id,
  })

  const { data: configCorretora } = useQuery({
    queryKey: ['corretora-config', corretora?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('corretoras')
        .select('nome_exibicao, logo_url, cor_primaria, cor_secundaria')
        .eq('id', corretora!.id)
        .single()
      return data as Record<string, string> | null
    },
    enabled: !!corretora?.id,
  })

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nomeExibido = configCorretora?.nome_exibicao ?? corretora?.nome ?? ''
  const corP = configCorretora?.cor_primaria ?? '#0f2744'

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>

      {/* Header com identidade da corretora */}
      <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ background: corP, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {configCorretora?.logo_url ? (
              <img src={configCorretora.logo_url} alt="Logo" style={{ height: 44, objectFit: 'contain', maxWidth: 160 }} />
            ) : (
              <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 8, padding: '6px 12px' }}>
                <span style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', fontSize: 22, fontWeight: 700, color: '#ffffff', letterSpacing: -.5 }}>QAR</span>
                <span style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', fontSize: 22, fontWeight: 300, color: 'rgba(255,255,255,.6)', letterSpacing: -.5 }}>tech</span>
              </div>
            )}
            <div>
              <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, marginBottom: 2 }}>{saudacao}, {usuario?.nome?.split(' ')[0]}!</p>
              <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{nomeExibido}</h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/cotacoes/nova"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500, backdropFilter: 'blur(4px)' }}>
              <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
              Nova cotação
            </Link>
            <Link href="/clientes/novo"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.85)', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
              <i className="ti ti-user-plus" style={{ fontSize: 14 }} aria-hidden="true" />
              Novo cliente
            </Link>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total de cotações', value: metricas?.total ?? 0, icon: 'ti-file-text', cor: 'var(--accent)' },
          { label: 'Em aberto', value: metricas?.em_aberto ?? 0, icon: 'ti-clock', cor: '#f59e0b' },
          { label: 'Este mês', value: metricas?.mes_atual ?? 0, icon: 'ti-calendar', cor: '#8b5cf6' },
          { label: 'Enviadas', value: metricas?.enviadas ?? 0, icon: 'ti-send', cor: '#3b82f6' },
          { label: 'Aprovadas', value: metricas?.aprovadas ?? 0, icon: 'ti-circle-check', cor: '#10b981' },
          { label: 'Conversão', value: `${metricas?.taxa ?? 0}%`, icon: 'ti-chart-bar', cor: '#ec4899' },
        ].map(m => (
          <div key={m.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <i className={`ti ${m.icon}`} style={{ fontSize: 16, color: m.cor }} aria-hidden="true" />
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{m.label}</span>
            </div>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Duas colunas: últimas cotações + últimos clientes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Últimas cotações */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-file-text" style={{ fontSize: 15, color: 'var(--text-2)' }} aria-hidden="true" />
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Últimas cotações</h2>
            </div>
            <Link href="/cotacoes" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Ver todas →</Link>
          </div>
          {!ultimasCotacoes?.length ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
              <i className="ti ti-file-off" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} aria-hidden="true" />
              Nenhuma cotação ainda
            </div>
          ) : (
            <div>
              {ultimasCotacoes.map((c) => {
                const cot = c as Record<string, unknown>
                return (
                  <Link key={cot.id as string} href={`/cotacoes/${cot.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-color)', textDecoration: 'none', transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-page)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="ti ti-file-text" style={{ fontSize: 14, color: 'var(--accent-text)' }} aria-hidden="true" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(cot.razao_social as string) ?? formatCNPJ(cot.cnpj as string)}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{cot.ramo as string} · {new Date(cot.criado_em as string).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className={`status-badge status-${cot.status}`} style={{ fontSize: 10 }}>
                      {STATUS_LABEL[cot.status as string] ?? cot.status as string}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Últimos clientes */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-building" style={{ fontSize: 15, color: 'var(--text-2)' }} aria-hidden="true" />
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Clientes recentes</h2>
            </div>
            <Link href="/clientes" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          {!ultimosClientes?.length ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
              <i className="ti ti-building-off" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} aria-hidden="true" />
              Nenhum cliente cadastrado
            </div>
          ) : (
            <div>
              {ultimosClientes.map((c) => {
                const cli = c as Record<string, unknown>
                return (
                  <Link key={cli.id as string} href={`/clientes/${cli.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-color)', textDecoration: 'none', transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-page)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent-text)', flexShrink: 0 }}>
                      {(cli.razao_social as string).substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cli.razao_social as string}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {formatCNPJ(cli.cnpj as string)}{cli.cidade_uf ? ` · ${cli.cidade_uf}` : ''}
                      </p>
                    </div>
                    <i className="ti ti-chevron-right" style={{ fontSize: 14, color: 'var(--text-3)', flexShrink: 0 }} aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Atalhos rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 16 }}>
        {[
          { href: '/cotacoes/nova', icon: 'ti-file-plus', label: 'Nova cotação', desc: 'Criar QAR' },
          { href: '/clientes/novo', icon: 'ti-building-plus', label: 'Novo cliente', desc: 'Cadastrar transportadora' },
          { href: '/cotacoes', icon: 'ti-files', label: 'Cotações', desc: 'Ver todas' },
          { href: '/clientes', icon: 'ti-building-community', label: 'Clientes', desc: 'Ver todos' },
          { href: '/configuracoes', icon: 'ti-settings', label: 'Configurações', desc: 'Personalizar' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 12px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', textDecoration: 'none', transition: 'all .15s', textAlign: 'center' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-light)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)' }}>
            <i className={`ti ${a.icon}`} style={{ fontSize: 22, color: 'var(--accent)', marginBottom: 8 }} aria-hidden="true" />
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{a.label}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
