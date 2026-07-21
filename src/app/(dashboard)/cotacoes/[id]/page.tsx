'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSessao, usePode } from '@/hooks/useSessao'
import { buscarCotacao, atualizarStatusCotacao } from '@/lib/queries/cotacoes'
import { statusConfig, formatBRL, formatCNPJ } from '@/lib/utils'
import { PDFPreviewModal } from '@/components/pdf/PDFPreviewModal'
import { EmailModal } from '@/components/email/EmailModal'
import { WhatsAppModal } from '@/components/whatsapp/WhatsAppModal'
import { AssinaturaModal } from '@/components/assinatura/AssinaturaModal'
import { PortalModal } from '@/components/portal/PortalModal'
import type { StatusCotacao } from '@/types/database'

const STATUS_OPCOES: StatusCotacao[] = ['rascunho', 'em_analise', 'pendente_dados', 'aprovada', 'enviada', 'arquivada']

// Componente de campo editável individual
function Campo({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
      <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 13, color: "var(--text-1)" }}>{value}</p>
    </div>
  )
}

// Cabeçalho de seção. O lápis abre o wizard na etapa correspondente, mesmo
// destino do botão "Editar cotação" do topo — não há mais edição inline.
function SecaoHeader({ titulo, onEditar }: {
  titulo: string
  onEditar: () => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{titulo}</h3>
      <button onClick={onEditar} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
        <i className="ti ti-pencil" style={{ fontSize: 12 }} /> Editar
      </button>
    </div>
  )
}

// Componente de botão de ação — declarado fora para evitar problemas de closure
function AcaoBtn({ onClick, iconBg, iconColor, icon, label, sub, subColor, border }: {
  onClick: () => void
  iconBg: string; iconColor: string; icon: string
  label: string; sub: string; subColor?: string; border?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', background: 'none', border: 'none', borderTop: border ? '1px solid var(--border-color)' : 'none', cursor: 'pointer', textAlign: 'left' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-page)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 18, color: iconColor }} aria-hidden="true" />
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11, color: subColor ?? 'var(--text-3)', margin: '2px 0 0' }}>{sub}</p>
      </div>
    </button>
  )
}

export default function CotacaoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { corretora } = useSessao()
  const pode = usePode('editar')
  const queryClient = useQueryClient()

  // A edição acontece no wizard (/cotacoes/nova?editar=...), não mais nesta tela.
  // Concentrar a gravação num único lugar evita que dois caminhos de escrita
  // divirjam — foi o que causou a perda de dados nas tabelas filhas.
  const abrirWizard = (etapa: number) => router.push(`/cotacoes/nova?editar=${id}&etapa=${etapa}`)

  const [showPDF, setShowPDF] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const [showAssinatura, setShowAssinatura] = useState(false)
  const [showPortal, setShowPortal] = useState(false)

  const { data: cotacao, isLoading, isError, error } = useQuery({
    queryKey: ['cotacao', id],
    queryFn: () => buscarCotacao(id),
    enabled: !!id,
    retry: 1,
  })

  async function mudarStatus(status: StatusCotacao) {
    await atualizarStatusCotacao(id, status)
    await queryClient.invalidateQueries({ queryKey: ['cotacao', id] })
    await queryClient.invalidateQueries({ queryKey: ['cotacoes', corretora?.id] })
  }

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Carregando cotação...</div>
  if (isError) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ fontSize: 14, color: '#f85149', marginBottom: 8 }}>Erro ao carregar cotação</p>
      <p style={{ fontSize: 12, color: '#8b949e', marginBottom: 16 }}>{String(error)}</p>
      <button onClick={() => router.push('/cotacoes')}
        style={{ padding: '8px 16px', background: '#1a6fbf', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
        Voltar para cotações
      </button>
    </div>
  )
  if (!cotacao) return <div className="p-6 text-sm text-gray-400">Cotação não encontrada.</div>

  const c = cotacao as Record<string, unknown>
  const status = statusConfig[c.status as StatusCotacao]
  const mercaRows = c.cotacao_mercadorias as Array<Record<string, unknown>> ?? []
  const percRows = c.cotacao_percursos as Array<Record<string, unknown>> ?? []
  const historico = c.historico_cotacao as Array<Record<string, unknown>> ?? []

  return (
    <>
    <div style={{ padding: 20, maxWidth: 960, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-2)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 15 }} />
          </button>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>
              {c.razao_social as string ?? c.cnpj as string}
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>
              {formatCNPJ(c.cnpj as string)} · {
                (c.ramos as string[] | null)?.length 
                  ? (c.ramos as string[]).join(', ')
                  : (c.ramo as string) ?? ''
              }
            </p>
          </div>
        </div>

        {/* Status + ações */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Botão Editar cotação — abre o wizard pré-preenchido */}
          {['rascunho', 'em_analise', 'pendente_dados'].includes(c.status as string) && (
            <button
              onClick={() => router.push(`/cotacoes/nova?editar=${id}`)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              <i className="ti ti-pencil" style={{ fontSize: 14 }} aria-hidden="true" />
              Editar cotação
            </button>
          )}
          <select
            value={c.status as string}
            onChange={e => mudarStatus(e.target.value as StatusCotacao)}
            disabled={!pode}
            className={`status-badge status-${c.status}`} style={{ cursor: "pointer", border: "none", outline: "none", fontSize: 12 }}
          >
            {STATUS_OPCOES.map(s => (
              <option key={s} value={s}>{statusConfig[s]?.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* Coluna principal */}
        <div style={{ gridColumn: "1 / 3", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* SEÇÃO 1: Dados cadastrais */}
          <div className="card" style={{ padding: 16 }}>
            <SecaoHeader titulo="Dados cadastrais" onEditar={() => abrirWizard(1)} />

            <div>
              <Campo label="Razão social" value={c.razao_social as string} />
              <Campo label="Nome fantasia" value={c.nome_fantasia as string} />
              <Campo label="CNPJ" value={formatCNPJ(c.cnpj as string)} />
              <Campo label="Atividade principal" value={c.atividade_principal as string} />
              <Campo label="Endereço" value={c.endereco as string} />
              <Campo label="CEP" value={c.cep as string} />
              <Campo label="Cidade / UF" value={c.cidade_uf as string} />
              <Campo label="Site" value={c.site as string} />
              <Campo label="ANTT / RNTRC" value={c.antt as string} />
              <Campo label="Contato" value={c.contato_nome as string} />
              <Campo label="E-mail" value={c.contato_email as string} />
              <Campo label="Telefone" value={c.contato_telefone as string} />
            </div>
          </div>

          {/* SEÇÃO 2: Ramo e transporte */}
          <div className="card" style={{ padding: 16 }}>
            <SecaoHeader titulo="Ramo e cobertura" onEditar={() => abrirWizard(2)} />

            <div>
              <Campo label={`Ramo${((c.ramos as string[] | null)?.length ?? 0) > 1 ? 's' : ''}`} value={
                (c.ramos as string[] | null)?.length 
                  ? (c.ramos as string[]).join(', ')
                  : (c.ramo as string) ?? '—'
              } />
              <Campo label="Terrestre" value={c.pct_terrestre ? `${c.pct_terrestre}%` : null} />
              <Campo label="Aéreo" value={c.pct_aereo ? `${c.pct_aereo}%` : null} />
              <Campo label="Aquaviário" value={c.pct_aquaviario ? `${c.pct_aquaviario}%` : null} />
              <Campo label="Ferroviário" value={c.pct_ferroviario ? `${c.pct_ferroviario}%` : null} />
              {mercaRows.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p className="text-xs text-gray-400 mb-1">Mercadorias</p>
                  {mercaRows.map((m, i) => (
                    <p key={i} className="text-sm text-gray-700 dark:text-gray-300">
                      {m.tipo as string}{m.percentual ? ` — ${m.percentual}%` : ''}
                    </p>
                  ))}
                </div>
              )}
              {percRows.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p className="text-xs text-gray-400 mb-1">Percursos</p>
                  {percRows.map((p, i) => (
                    <p key={i} className="text-sm text-gray-700 dark:text-gray-300">
                      {p.origem as string} → {p.destino as string}{p.percentual ? ` (${p.percentual}%)` : ''}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 3: Operação */}
          <div className="card" style={{ padding: 16 }}>
            <SecaoHeader titulo="Operação mensal" onEditar={() => abrirWizard(3)} />

            <div>
              <Campo label="Qtd. embarques / mês" value={c.qtd_embarques_mes as number} />
              <Campo label="Valor médio por embarque" value={formatBRL(c.valor_medio_embarque as number)} />
              <Campo label="Valor máximo por embarque" value={formatBRL(c.valor_maximo_embarque as number)} />
              <Campo label="Importância segurada total" value={formatBRL(c.importancia_segurada as number)} />
              <Campo label="Detalhes da operação" value={c.detalhes_operacao as string} />
              <Campo label="Obs. sazonalidade / safra" value={c.obs_sazonalidade as string} />
              {(c.pct_frota || c.pct_transportadoras || c.pct_agregado || c.pct_autonomo) ? (
                <div style={{ marginTop: 8 }}>
                  <p className="text-xs text-gray-400 mb-1">Motoristas</p>
                  {c.pct_frota ? <p className="text-sm text-gray-700 dark:text-gray-300">Frota: {c.pct_frota as number}%</p> : null}
                  {c.pct_transportadoras ? <p className="text-sm text-gray-700 dark:text-gray-300">Sub-contratadas: {c.pct_transportadoras as number}%</p> : null}
                  {c.pct_agregado ? <p className="text-sm text-gray-700 dark:text-gray-300">Agregado: {c.pct_agregado as number}%</p> : null}
                  {c.pct_autonomo ? <p className="text-sm text-gray-700 dark:text-gray-300">Autônomo: {c.pct_autonomo as number}%</p> : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Coluna lateral: histórico */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Histórico</h3>
            {historico.length === 0 ? (
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Nenhum registro.</p>
            ) : (
              <div className="space-y-3">
                {[...historico].reverse().map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 12, color: "var(--text-1)" }}>
                        {h.evento === 'cotacao_criada' && 'Cotação criada'}
                        {h.evento === 'mudanca_status' && `Status: ${statusConfig[(h.detalhes as Record<string, unknown>)?.para as StatusCotacao]?.label ?? h.evento}`}
                        {!['cotacao_criada', 'mudanca_status'].includes(h.evento as string) && h.evento as string}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                        {new Date(h.criado_em as string).toLocaleString('pt-BR')}
                        {(h.usuario as Record<string, unknown>)?.nome ? ` · ${(h.usuario as Record<string, unknown>).nome}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ações */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.8px', margin: 0 }}>Ações</p>
            </div>
            <div>

              {/* PDF */}
              <AcaoBtn onClick={() => setShowPDF(true)} iconBg="#fef3c7" iconColor="#d97706" icon="ti-file-invoice" label="Gerar PDF" sub="Visualizar, imprimir ou baixar" />

              {/* E-mail */}
              <AcaoBtn onClick={() => setShowEmail(true)} iconBg="#ede9fe" iconColor="#7c3aed" icon="ti-mail" label="Enviar por e-mail" sub="Enviar QAR para o contato" border />

              {/* WhatsApp */}
              <AcaoBtn onClick={() => setShowWhatsApp(true)} iconBg="#dcfce7" iconColor="#16a34a" icon="ti-brand-whatsapp" label="WhatsApp" sub="Compartilhar via WhatsApp" border />

              {/* Portal */}
              <AcaoBtn
                onClick={() => setShowPortal(true)}
                iconBg={c.portal_status === 'confirmado' ? '#dcfce7' : c.portal_status ? '#fef3c7' : '#e0f2fe'}
                iconColor={c.portal_status === 'confirmado' ? '#16a34a' : c.portal_status ? '#d97706' : '#0284c7'}
                icon="ti-world"
                label="Portal da transportadora"
                sub={c.portal_status === 'confirmado' ? '✓ Confirmado pela transportadora'
                  : c.portal_status === 'ajuste_solicitado' ? '⚠ Ajuste solicitado'
                  : c.portal_status === 'visualizado' ? 'Visualizado — aguardando confirmação'
                  : c.portal_status === 'enviado' ? 'Link enviado — aguardando acesso'
                  : 'Enviar link para a transportadora'}
                subColor={c.portal_status === 'confirmado' ? '#16a34a' : c.portal_status ? '#d97706' : undefined}
                border
              />

              {/* Assinatura */}
              <AcaoBtn
                onClick={() => setShowAssinatura(true)}
                iconBg={c.assinatura_status === 'assinado' ? '#dcfce7' : '#f3e8ff'}
                iconColor={c.assinatura_status === 'assinado' ? '#16a34a' : '#9333ea'}
                icon="ti-signature"
                label="Assinatura digital"
                sub={c.assinatura_status === 'assinado' ? '✓ Documento assinado'
                  : c.assinatura_status === 'pendente' ? 'Aguardando assinatura'
                  : 'Enviar para assinatura'}
                subColor={c.assinatura_status === 'assinado' ? '#16a34a' : undefined}
                border
              />

            </div>

          </div>
        </div>
      </div>
    </div>

    {/* Modais — renderizados fora do layout para cobrir tela toda */}
    {showPDF && (
      <PDFPreviewModal cotacaoId={id} onClose={() => setShowPDF(false)} />
    )}
    {showEmail && (
      <EmailModal
        cotacaoId={id}
        destinatarioNomePadrao={(c.contato_nome as string) ?? (c.razao_social as string) ?? ''}
        destinatarioEmailPadrao={(c.contato_email as string) ?? ''}
        onClose={() => setShowEmail(false)}
      />
    )}
    {showPortal && (
      <PortalModal
        cotacaoId={id}
        contatoNome={c.contato_nome as string}
        contatoEmail={c.contato_email as string}
        portalStatus={c.portal_status as string}
        onClose={() => setShowPortal(false)}
        onEnviado={() => queryClient.invalidateQueries({ queryKey: ['cotacao', id] })}
      />
    )}
    {showWhatsApp && (
      <WhatsAppModal
        cotacaoId={id}
        razaoSocial={c.razao_social as string}
        cnpj={c.cnpj as string}
        ramo={c.ramo as string}
        contatoNome={c.contato_nome as string}
        contatoTelefone={c.contato_telefone as string}
        onClose={() => setShowWhatsApp(false)}
      />
    )}
    {showAssinatura && (
      <AssinaturaModal
        cotacaoId={id}
        razaoSocial={c.razao_social as string}
        contatoNome={c.contato_nome as string}
        contatoEmail={c.contato_email as string}
        assinaturaStatus={c.assinatura_status as string}
        assinaturaLink={c.assinatura_link as string}
        onClose={() => setShowAssinatura(false)}
        onEnviado={() => queryClient.invalidateQueries({ queryKey: ['cotacao', id] })}
      />
    )}
    </>
  )
}