'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { useSessao } from '@/hooks/useSessao'
import { listarCotacoes, buscarMetricasCotacoes } from '@/lib/queries/cotacoes'
import { formatBRL, formatCNPJ } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', em_analise: 'Em análise', pendente_dados: 'Pendente',
  aprovada: 'Aprovada', enviada: 'Enviada', arquivada: 'Arquivada',
}

export default function CotacoesPage() {
  const { corretora } = useSessao()
  const [busca, setBusca] = useState('')

  const { data: cotacoes, isLoading } = useQuery({
    queryKey: ['cotacoes', corretora?.id],
    queryFn: () => listarCotacoes(corretora!.id),
    enabled: !!corretora?.id,
  })

  const { data: metricas } = useQuery({
    queryKey: ['metricas', corretora?.id],
    queryFn: () => buscarMetricasCotacoes(corretora!.id),
    enabled: !!corretora?.id,
  })

  const filtradas = (cotacoes as Record<string, unknown>[] ?? []).filter(c =>
    (c.razao_social as string ?? '').toLowerCase().includes(busca.toLowerCase()) ||
    (c.cnpj as string ?? '').includes(busca)
  )

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Em aberto', value: metricas?.em_aberto ?? 0, icon: 'ti-clock', color: 'var(--status-analysis-text)' },
          { label: 'Enviadas', value: metricas?.enviadas_mes ?? 0, icon: 'ti-send', color: 'var(--status-sent-text)' },
          { label: 'Aprovadas', value: metricas?.aprovadas ?? 0, icon: 'ti-circle-check', color: 'var(--status-approved-text)' },
          { label: 'Conversão', value: `${metricas?.taxa_conversao ?? 0}%`, icon: 'ti-chart-bar', color: 'var(--accent)' },
        ].map(m => (
          <div key={m.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <i className={`ti ${m.icon}`} style={{ fontSize: 16, color: m.color }} aria-hidden="true" />
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-1)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Card da tabela */}
      <div className="card">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Cotações</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-3)' }} aria-hidden="true" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar empresa ou CNPJ..."
                className="field-input"
                style={{ paddingLeft: 32, width: 220, fontSize: 12 }}
              />
            </div>
            <Link href="/cotacoes/nova" className="btn-primary" style={{ fontSize: 12 }}>
              <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
              Nova cotação
            </Link>
          </div>
        </div>

        {/* Tabela */}
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Carregando cotações...</div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <i className="ti ti-file-off" style={{ fontSize: 32, color: 'var(--text-3)', display: 'block', marginBottom: 10 }} aria-hidden="true" />
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
              {busca ? 'Nenhuma cotação encontrada.' : 'Nenhuma cotação ainda.'}
            </p>
            {!busca && (
              <Link href="/cotacoes/nova" className="btn-primary" style={{ fontSize: 12 }}>
                <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
                Criar primeira cotação
              </Link>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th className="hide-mobile">Ramo</th>
                  <th className="hide-mobile">Importância segurada</th>
                  <th>Status</th>
                  <th className="hide-mobile">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(c => (
                  <tr key={c.id as string} onClick={() => window.location.href = `/cotacoes/${c.id}`}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{(c.razao_social as string) ?? (c.cnpj as string)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{formatCNPJ(c.cnpj as string)}</div>
                    </td>
                    <td className="hide-mobile" style={{ color: 'var(--text-2)' }}>{c.ramo as string ?? '—'}</td>
                    <td className="hide-mobile" style={{ color: 'var(--text-2)' }}>
                      {c.importancia_segurada ? formatBRL(c.importancia_segurada as number) : '—'}
                    </td>
                    <td>
                      <span className={`status-badge status-${c.status}`}>
                        {STATUS_LABEL[c.status as string] ?? c.status as string}
                      </span>
                    </td>
                    <td className="hide-mobile" style={{ color: 'var(--text-3)', fontSize: 12 }}>
                      {new Date(c.atualizado_em as string).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtradas.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-3)', textAlign: 'right' }}>
            {filtradas.length} cotação{filtradas.length !== 1 ? 'ões' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
