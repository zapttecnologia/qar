'use client'

import Link from 'next/link'
import { useCotacoes } from '@/hooks/useCotacoes'

interface Props {
  compact?: boolean  // versão compacta para o header
}

export function BannerCotacoes({ compact = false }: Props) {
  const { pode, usadas, limite, restantes, alerta, motivo, mensagem, carregando } = useCotacoes()

  if (carregando || !limite) return null

  const pct = limite > 0 ? Math.min((usadas / limite) * 100, 100) : 0
  const corBarra = pct >= 100 ? '#f85149' : pct >= 80 ? '#f59e0b' : '#3fb950'

  // Versão compacta — para o topbar
  if (compact) {
    if (!alerta && pode) return null
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: pode ? '#2d1a00' : '#2d0e0e', borderRadius: 6, border: `1px solid ${pode ? '#f59e0b40' : '#f8514940'}` }}>
        <i className={`ti ${pode ? 'ti-alert-triangle' : 'ti-lock'}`}
          style={{ fontSize: 13, color: pode ? '#f59e0b' : '#f85149', flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontSize: 11, color: pode ? '#f59e0b' : '#f85149', whiteSpace: 'nowrap' }}>
          {pode ? `${restantes} cotaç${restantes === 1 ? 'ão' : 'ões'} restante${restantes === 1 ? '' : 's'}` : 'Limite atingido'}
        </span>
        <Link href="/configuracoes" style={{ fontSize: 10, color: '#58a6ff', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Upgrade →
        </Link>
      </div>
    )
  }

  // Versão completa — banner no topo da página
  if (pode && !alerta) return null

  return (
    <div style={{
      background: pode ? '#1a1200' : '#1a0505',
      border: `1px solid ${pode ? '#f59e0b40' : '#f8514940'}`,
      borderRadius: 8, padding: '12px 16px', marginBottom: 16,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: pode ? '#2d1a00' : '#2d0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ${pode ? 'ti-alert-triangle' : 'ti-lock'}`}
          style={{ fontSize: 18, color: pode ? '#f59e0b' : '#f85149' }} aria-hidden="true" />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: pode ? '#f59e0b' : '#f85149', margin: '0 0 4px' }}>
          {pode
            ? `Atenção: ${restantes} cotaç${restantes === 1 ? 'ão restante' : 'ões restantes'} este mês`
            : motivo === 'plano_vencido' ? 'Período de trial encerrado'
            : motivo === 'assinatura_inativa' ? 'Assinatura inativa'
            : 'Limite de cotações atingido'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 10px', lineHeight: 1.5 }}>
          {mensagem ?? `Você usou ${usadas} de ${limite} cotações disponíveis este mês.`}
        </p>
        {/* Barra de progresso */}
        {limite && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{usadas} usadas</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{limite} no plano</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 3 }}>
              <div style={{ height: 5, background: corBarra, borderRadius: 3, width: `${pct}%`, transition: 'width .3s' }} />
            </div>
          </div>
        )}
        <Link href="/configuracoes"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: pode ? '#f59e0b' : '#f85149', color: '#000', borderRadius: 5, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          <i className="ti ti-arrow-up-circle" style={{ fontSize: 13 }} aria-hidden="true" />
          {pode ? 'Ver planos de upgrade' : 'Fazer upgrade agora'}
        </Link>
      </div>
    </div>
  )
}
