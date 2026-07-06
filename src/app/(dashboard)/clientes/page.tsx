'use client'

export const dynamic = 'force-dynamic'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { useSessao, usePode } from '@/hooks/useSessao'
import { listarClientes } from '@/lib/queries/clientes'

export default function ClientesPage() {
  const { corretora } = useSessao()
  const pode = usePode('criar')
  const [busca, setBusca] = useState('')

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes', corretora?.id],
    queryFn: () => listarClientes(corretora!.id),
    enabled: !!corretora?.id,
  })

  const filtrados = clientes?.filter(c =>
    c.razao_social.toLowerCase().includes(busca.toLowerCase()) ||
    c.cnpj.includes(busca) ||
    (c.nome_fantasia ?? '').toLowerCase().includes(busca.toLowerCase())
  ) ?? []

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <div className="card">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Clientes</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-3)' }} aria-hidden="true" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por nome ou CNPJ..."
                className="field-input"
                style={{ paddingLeft: 32, width: 220, fontSize: 12 }}
              />
            </div>
            {pode && (
              <Link href="/clientes/novo" className="btn-primary" style={{ fontSize: 12 }}>
                <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
                Novo cliente
              </Link>
            )}
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Carregando clientes...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <i className="ti ti-building-off" style={{ fontSize: 32, color: 'var(--text-3)', display: 'block', marginBottom: 10 }} aria-hidden="true" />
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
              {busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
            </p>
            {pode && !busca && (
              <Link href="/clientes/novo" className="btn-primary" style={{ fontSize: 12 }}>
                <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
                Cadastrar primeiro cliente
              </Link>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th className="hide-mobile">Cidade / UF</th>
                  <th className="hide-mobile">ANTT</th>
                  <th className="hide-mobile">Contato</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.id} onClick={() => window.location.href = `/clientes/${c.id}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--accent-text)', flexShrink: 0 }}>
                          {(c.nome_fantasia ?? c.razao_social).substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{c.razao_social}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                            {c.nome_fantasia && `${c.nome_fantasia} · `}{c.cnpj}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hide-mobile" style={{ color: 'var(--text-2)', fontSize: 12 }}>{c.cidade_uf ?? '—'}</td>
                    <td className="hide-mobile">
                      {c.antt ? (
                        <span style={{ fontSize: 11, padding: '3px 8px', background: 'var(--status-sent-bg)', color: 'var(--status-sent-text)', borderRadius: 4, fontWeight: 500 }}>
                          {c.antt}
                        </span>
                      ) : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>}
                    </td>
                    <td className="hide-mobile" style={{ color: 'var(--text-2)', fontSize: 12 }}>
                      {c.contato_email ?? c.contato_telefone ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtrados.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-3)', textAlign: 'right' }}>
            {filtrados.length} de {clientes?.length ?? 0} clientes
          </div>
        )}
      </div>
    </div>
  )
}
