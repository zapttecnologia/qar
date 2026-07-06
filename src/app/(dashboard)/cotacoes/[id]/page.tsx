'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Check, X, Plus, Trash2, FileText } from 'lucide-react'
import { useSessao, usePode } from '@/hooks/useSessao'
import { buscarCotacao, atualizarCotacao, atualizarStatusCotacao, salvarMercadorias, salvarPercursos } from '@/lib/queries/cotacoes'
import { statusConfig, formatBRL, formatCNPJ } from '@/lib/utils'
import { PDFPreviewModal } from '@/components/pdf/PDFPreviewModal'
import { EmailModal } from '@/components/email/EmailModal'
import { WhatsAppModal } from '@/components/whatsapp/WhatsAppModal'
import { AssinaturaModal } from '@/components/assinatura/AssinaturaModal'
import type { StatusCotacao, RamoSeguro } from '@/types/database'

const RAMOS: RamoSeguro[] = ['RCTR-C', 'RC-DC', 'RCTA-C', 'RCT-OM', 'RCTR-VI', 'RCA-C']
const STATUS_OPCOES: StatusCotacao[] = ['rascunho', 'em_analise', 'pendente_dados', 'aprovada', 'enviada', 'arquivada']

// Componente de campo editável individual
function Campo({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div className="py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

// Cabeçalho de seção com botão editar
function SecaoHeader({ titulo, editando, onEditar, onCancelar, onSalvar, salvando }: {
  titulo: string
  editando: boolean
  onEditar: () => void
  onCancelar: () => void
  onSalvar: () => void
  salvando: boolean
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{titulo}</h3>
      {!editando ? (
        <button onClick={onEditar} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
          <Pencil className="w-3 h-3" /> Editar
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 disabled:opacity-50"
          >
            <Check className="w-3 h-3" /> {salvando ? 'Salvando...' : 'Salvar'}
          </button>
          <button onClick={onCancelar} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <X className="w-3 h-3" /> Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

// Input reutilizável para modo de edição
function InputEdit({ label, value, onChange, type = 'text', full = false }: {
  label: string; value: string | number; onChange: (v: string) => void
  type?: string; full?: boolean
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

export default function CotacaoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { corretora } = useSessao()
  const pode = usePode('editar')
  const queryClient = useQueryClient()

  // Controle de qual seção está em edição
  const [editando, setEditando] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Estados locais de edição por seção
  const [d1, setD1] = useState<Record<string, string>>({})
  const [d2, setD2] = useState<Record<string, string | number>>({})
  const [d3, setD3] = useState<Record<string, string | number>>({})
  const [mercadorias, setMercadorias] = useState<Array<{ tipo: string; embarcador: string; percentual: number }>>([])
  const [percursos, setPercursos] = useState<Array<{ origem: string; destino: string; percentual: number }>>([])

  const [showPDF, setShowPDF] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const [showAssinatura, setShowAssinatura] = useState(false)

  const { data: cotacao, isLoading } = useQuery({
    queryKey: ['cotacao', id],
    queryFn: () => buscarCotacao(id),
    enabled: !!id,
  })

  function iniciarEdicao(secao: string) {
    if (!cotacao) return
    const c = cotacao as Record<string, unknown>
    setEditando(secao)

    if (secao === 'cadastro') {
      setD1({
        cnpj: c.cnpj as string ?? '',
        razao_social: c.razao_social as string ?? '',
        nome_fantasia: c.nome_fantasia as string ?? '',
        atividade_principal: c.atividade_principal as string ?? '',
        endereco: c.endereco as string ?? '',
        cep: c.cep as string ?? '',
        cidade_uf: c.cidade_uf as string ?? '',
        site: c.site as string ?? '',
        antt: c.antt as string ?? '',
        contato_nome: c.contato_nome as string ?? '',
        contato_email: c.contato_email as string ?? '',
        contato_telefone: c.contato_telefone as string ?? '',
      })
    }

    if (secao === 'ramo') {
      setD2({
        ramo: c.ramo as string ?? '',
        pct_terrestre: c.pct_terrestre as number ?? 0,
        pct_aereo: c.pct_aereo as number ?? 0,
        pct_aquaviario: c.pct_aquaviario as number ?? 0,
        pct_ferroviario: c.pct_ferroviario as number ?? 0,
      })
      setMercadorias(
        (c.cotacao_mercadorias as Array<{ tipo: string; embarcador: string; percentual: number }> ?? [])
          .map(m => ({ tipo: m.tipo, embarcador: m.embarcador ?? '', percentual: m.percentual ?? 0 }))
      )
      setPercursos(
        (c.cotacao_percursos as Array<{ origem: string; destino: string; percentual: number }> ?? [])
          .map(p => ({ origem: p.origem, destino: p.destino, percentual: p.percentual ?? 0 }))
      )
    }

    if (secao === 'operacao') {
      setD3({
        qtd_embarques_mes: c.qtd_embarques_mes as number ?? '',
        valor_medio_embarque: c.valor_medio_embarque as number ?? '',
        valor_maximo_embarque: c.valor_maximo_embarque as number ?? '',
        importancia_segurada: c.importancia_segurada as number ?? '',
        obs_sazonalidade: c.obs_sazonalidade as string ?? '',
        detalhes_operacao: c.detalhes_operacao as string ?? '',
        pct_frota: c.pct_frota as number ?? 0,
        pct_transportadoras: c.pct_transportadoras as number ?? 0,
        pct_agregado: c.pct_agregado as number ?? 0,
        pct_autonomo: c.pct_autonomo as number ?? 0,
      })
    }
  }

  async function salvarSecao(secao: string) {
    setSalvando(true)
    try {
      if (secao === 'cadastro') {
        await atualizarCotacao(id, d1 as never)
      }
      if (secao === 'ramo') {
        await atualizarCotacao(id, {
          ramo: d2.ramo as RamoSeguro,
          pct_terrestre: Number(d2.pct_terrestre),
          pct_aereo: Number(d2.pct_aereo),
          pct_aquaviario: Number(d2.pct_aquaviario),
          pct_ferroviario: Number(d2.pct_ferroviario),
        })
        await salvarMercadorias(id, mercadorias)
        await salvarPercursos(id, percursos)
      }
      if (secao === 'operacao') {
        await atualizarCotacao(id, {
          qtd_embarques_mes: Number(d3.qtd_embarques_mes) || null,
          valor_medio_embarque: Number(d3.valor_medio_embarque) || null,
          valor_maximo_embarque: Number(d3.valor_maximo_embarque) || null,
          importancia_segurada: Number(d3.importancia_segurada) || null,
          obs_sazonalidade: d3.obs_sazonalidade as string || null,
          detalhes_operacao: d3.detalhes_operacao as string || null,
          pct_frota: Number(d3.pct_frota),
          pct_transportadoras: Number(d3.pct_transportadoras),
          pct_agregado: Number(d3.pct_agregado),
          pct_autonomo: Number(d3.pct_autonomo),
        })
      }
      await queryClient.invalidateQueries({ queryKey: ['cotacao', id] })
      await queryClient.invalidateQueries({ queryKey: ['cotacoes', corretora?.id] })
      setEditando(null)
    } catch {
      alert('Erro ao salvar. Tente novamente.')
    }
    setSalvando(false)
  }

  async function mudarStatus(status: StatusCotacao) {
    await atualizarStatusCotacao(id, status)
    await queryClient.invalidateQueries({ queryKey: ['cotacao', id] })
    await queryClient.invalidateQueries({ queryKey: ['cotacoes', corretora?.id] })
  }

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Carregando cotação...</div>
  if (!cotacao) return <div className="p-6 text-sm text-gray-400">Cotação não encontrada.</div>

  const c = cotacao as Record<string, unknown>
  const status = statusConfig[c.status as StatusCotacao]
  const mercaRows = c.cotacao_mercadorias as Array<Record<string, unknown>> ?? []
  const percRows = c.cotacao_percursos as Array<Record<string, unknown>> ?? []
  const historico = c.historico_cotacao as Array<Record<string, unknown>> ?? []

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {c.razao_social as string ?? c.cnpj as string}
            </h1>
            <p className="text-sm text-gray-500">
              {formatCNPJ(c.cnpj as string)} · {c.ramo as string}
            </p>
          </div>
        </div>

        {/* Status + ações */}
        <div className="flex items-center gap-2">
          <select
            value={c.status as string}
            onChange={e => mudarStatus(e.target.value as StatusCotacao)}
            disabled={!pode}
            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${status?.className}`}
          >
            {STATUS_OPCOES.map(s => (
              <option key={s} value={s}>{statusConfig[s]?.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Coluna principal */}
        <div className="col-span-2 space-y-4">

          {/* SEÇÃO 1: Dados cadastrais */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <SecaoHeader
              titulo="Dados cadastrais"
              editando={editando === 'cadastro'}
              onEditar={() => iniciarEdicao('cadastro')}
              onCancelar={() => setEditando(null)}
              onSalvar={() => salvarSecao('cadastro')}
              salvando={salvando}
            />

            {editando === 'cadastro' ? (
              <div className="grid grid-cols-2 gap-3">
                <InputEdit label="CNPJ" value={d1.cnpj} onChange={v => setD1(p => ({ ...p, cnpj: v }))} full />
                <InputEdit label="Razão social" value={d1.razao_social} onChange={v => setD1(p => ({ ...p, razao_social: v }))} full />
                <InputEdit label="Nome fantasia" value={d1.nome_fantasia} onChange={v => setD1(p => ({ ...p, nome_fantasia: v }))} />
                <InputEdit label="Atividade principal" value={d1.atividade_principal} onChange={v => setD1(p => ({ ...p, atividade_principal: v }))} />
                <InputEdit label="Endereço" value={d1.endereco} onChange={v => setD1(p => ({ ...p, endereco: v }))} full />
                <InputEdit label="CEP" value={d1.cep} onChange={v => setD1(p => ({ ...p, cep: v }))} />
                <InputEdit label="Cidade / UF" value={d1.cidade_uf} onChange={v => setD1(p => ({ ...p, cidade_uf: v }))} />
                <InputEdit label="Site" value={d1.site} onChange={v => setD1(p => ({ ...p, site: v }))} />
                <InputEdit label="ANTT" value={d1.antt} onChange={v => setD1(p => ({ ...p, antt: v }))} />
                <InputEdit label="Contato" value={d1.contato_nome} onChange={v => setD1(p => ({ ...p, contato_nome: v }))} />
                <InputEdit label="E-mail" value={d1.contato_email} onChange={v => setD1(p => ({ ...p, contato_email: v }))} type="email" />
                <InputEdit label="Telefone" value={d1.contato_telefone} onChange={v => setD1(p => ({ ...p, contato_telefone: v }))} />
              </div>
            ) : (
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
            )}
          </div>

          {/* SEÇÃO 2: Ramo e transporte */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <SecaoHeader
              titulo="Ramo e cobertura"
              editando={editando === 'ramo'}
              onEditar={() => iniciarEdicao('ramo')}
              onCancelar={() => setEditando(null)}
              onSalvar={() => salvarSecao('ramo')}
              salvando={salvando}
            />

            {editando === 'ramo' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ramo</label>
                  <div className="flex gap-2 flex-wrap">
                    {RAMOS.map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setD2(p => ({ ...p, ramo: r }))
                          if (r === 'RCTR-C') setD2(p => ({ ...p, ramo: r, pct_terrestre: 100, pct_aereo: 0, pct_aquaviario: 0, pct_ferroviario: 0 }))
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                          ${d2.ramo === r
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Tipo de transporte (%)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[['pct_terrestre','Terrestre'], ['pct_aereo','Aéreo'], ['pct_aquaviario','Aquaviário'], ['pct_ferroviario','Ferroviário']].map(([k, lbl]) => (
                      <InputEdit key={k} label={lbl} value={d2[k] as number} onChange={v => setD2(p => ({ ...p, [k]: v }))} type="number" />
                    ))}
                  </div>
                </div>

                {/* Mercadorias */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500">Mercadorias</p>
                    <button type="button" onClick={() => setMercadorias(p => [...p, { tipo: '', embarcador: '', percentual: 0 }])}
                      className="text-xs text-blue-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar</button>
                  </div>
                  {mercadorias.map((m, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                      <input value={m.tipo} placeholder="Tipo" onChange={e => setMercadorias(p => p.map((x, j) => j === i ? { ...x, tipo: e.target.value } : x))}
                        className="flex-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white" />
                      <input value={m.embarcador} placeholder="Embarcador" onChange={e => setMercadorias(p => p.map((x, j) => j === i ? { ...x, embarcador: e.target.value } : x))}
                        className="flex-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white" />
                      <input value={m.percentual} type="number" placeholder="%" onChange={e => setMercadorias(p => p.map((x, j) => j === i ? { ...x, percentual: Number(e.target.value) } : x))}
                        className="w-16 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white" />
                      <button onClick={() => setMercadorias(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Percursos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500">Percursos</p>
                    <button type="button" onClick={() => setPercursos(p => [...p, { origem: '', destino: '', percentual: 0 }])}
                      className="text-xs text-blue-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar</button>
                  </div>
                  {percursos.map((p, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                      <input value={p.origem} placeholder="Origem" onChange={e => setPercursos(prev => prev.map((x, j) => j === i ? { ...x, origem: e.target.value } : x))}
                        className="flex-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white" />
                      <input value={p.destino} placeholder="Destino" onChange={e => setPercursos(prev => prev.map((x, j) => j === i ? { ...x, destino: e.target.value } : x))}
                        className="flex-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white" />
                      <input value={p.percentual} type="number" placeholder="%" onChange={e => setPercursos(prev => prev.map((x, j) => j === i ? { ...x, percentual: Number(e.target.value) } : x))}
                        className="w-16 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white" />
                      <button onClick={() => setPercursos(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <Campo label="Ramo" value={c.ramo as string} />
                <Campo label="Terrestre" value={c.pct_terrestre ? `${c.pct_terrestre}%` : null} />
                <Campo label="Aéreo" value={c.pct_aereo ? `${c.pct_aereo}%` : null} />
                <Campo label="Aquaviário" value={c.pct_aquaviario ? `${c.pct_aquaviario}%` : null} />
                <Campo label="Ferroviário" value={c.pct_ferroviario ? `${c.pct_ferroviario}%` : null} />
                {mercaRows.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1">Mercadorias</p>
                    {mercaRows.map((m, i) => (
                      <p key={i} className="text-sm text-gray-700 dark:text-gray-300">
                        {m.tipo as string}{m.percentual ? ` — ${m.percentual}%` : ''}
                      </p>
                    ))}
                  </div>
                )}
                {percRows.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1">Percursos</p>
                    {percRows.map((p, i) => (
                      <p key={i} className="text-sm text-gray-700 dark:text-gray-300">
                        {p.origem as string} → {p.destino as string}{p.percentual ? ` (${p.percentual}%)` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SEÇÃO 3: Operação */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <SecaoHeader
              titulo="Operação mensal"
              editando={editando === 'operacao'}
              onEditar={() => iniciarEdicao('operacao')}
              onCancelar={() => setEditando(null)}
              onSalvar={() => salvarSecao('operacao')}
              salvando={salvando}
            />

            {editando === 'operacao' ? (
              <div className="grid grid-cols-2 gap-3">
                <InputEdit label="Qtd. embarques / mês" value={d3.qtd_embarques_mes} onChange={v => setD3(p => ({ ...p, qtd_embarques_mes: v }))} type="number" />
                <InputEdit label="Valor médio por embarque (R$)" value={d3.valor_medio_embarque} onChange={v => setD3(p => ({ ...p, valor_medio_embarque: v }))} type="number" />
                <InputEdit label="Valor máximo por embarque (R$)" value={d3.valor_maximo_embarque} onChange={v => setD3(p => ({ ...p, valor_maximo_embarque: v }))} type="number" />
                <InputEdit label="Importância segurada total (R$)" value={d3.importancia_segurada} onChange={v => setD3(p => ({ ...p, importancia_segurada: v }))} type="number" />
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Detalhes da operação</label>
                  <textarea value={d3.detalhes_operacao as string} onChange={e => setD3(p => ({ ...p, detalhes_operacao: e.target.value }))} rows={3}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Observações sazonalidade / safra</label>
                  <textarea value={d3.obs_sazonalidade as string} onChange={e => setD3(p => ({ ...p, obs_sazonalidade: e.target.value }))} rows={2}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <p className="col-span-2 text-xs font-medium text-gray-500 mt-1">Motoristas (%)</p>
                <InputEdit label="Frota própria" value={d3.pct_frota} onChange={v => setD3(p => ({ ...p, pct_frota: v }))} type="number" />
                <InputEdit label="Transportadoras (sub-contratadas)" value={d3.pct_transportadoras} onChange={v => setD3(p => ({ ...p, pct_transportadoras: v }))} type="number" />
                <InputEdit label="Agregado" value={d3.pct_agregado} onChange={v => setD3(p => ({ ...p, pct_agregado: v }))} type="number" />
                <InputEdit label="Autônomo" value={d3.pct_autonomo} onChange={v => setD3(p => ({ ...p, pct_autonomo: v }))} type="number" />
              </div>
            ) : (
              <div>
                <Campo label="Qtd. embarques / mês" value={c.qtd_embarques_mes as number} />
                <Campo label="Valor médio por embarque" value={formatBRL(c.valor_medio_embarque as number)} />
                <Campo label="Valor máximo por embarque" value={formatBRL(c.valor_maximo_embarque as number)} />
                <Campo label="Importância segurada total" value={formatBRL(c.importancia_segurada as number)} />
                <Campo label="Detalhes da operação" value={c.detalhes_operacao as string} />
                <Campo label="Obs. sazonalidade / safra" value={c.obs_sazonalidade as string} />
                {(c.pct_frota || c.pct_transportadoras || c.pct_agregado || c.pct_autonomo) ? (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1">Motoristas</p>
                    {c.pct_frota ? <p className="text-sm text-gray-700 dark:text-gray-300">Frota: {c.pct_frota as number}%</p> : null}
                    {c.pct_transportadoras ? <p className="text-sm text-gray-700 dark:text-gray-300">Sub-contratadas: {c.pct_transportadoras as number}%</p> : null}
                    {c.pct_agregado ? <p className="text-sm text-gray-700 dark:text-gray-300">Agregado: {c.pct_agregado as number}%</p> : null}
                    {c.pct_autonomo ? <p className="text-sm text-gray-700 dark:text-gray-300">Autônomo: {c.pct_autonomo as number}%</p> : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Coluna lateral: histórico */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Histórico</h3>
            {historico.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum registro.</p>
            ) : (
              <div className="space-y-3">
                {[...historico].reverse().map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        {h.evento === 'cotacao_criada' && 'Cotação criada'}
                        {h.evento === 'mudanca_status' && `Status: ${statusConfig[(h.detalhes as Record<string, unknown>)?.para as StatusCotacao]?.label ?? h.evento}`}
                        {!['cotacao_criada', 'mudanca_status'].includes(h.evento as string) && h.evento as string}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(h.criado_em as string).toLocaleString('pt-BR')}
                        {(h.usuario as Record<string, unknown>)?.nome ? ` · ${(h.usuario as Record<string, unknown>).nome}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ações futuras (PDF, e-mail) */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Ações</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowPDF(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FileText className="w-4 h-4 text-gray-400" />
                Gerar PDF / Imprimir
              </button>
              <button
                onClick={() => setShowEmail(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-base leading-none">✉️</span> Enviar por e-mail
              </button>
              <button
                onClick={() => setShowWhatsApp(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-base leading-none">💬</span> Enviar pelo WhatsApp
              </button>
              <button
                onClick={() => setShowAssinatura(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-base leading-none">✍️</span>
                <span className={c.assinatura_status ? 'text-purple-600 dark:text-purple-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                  {c.assinatura_status === 'pendente' ? 'Assinatura pendente'
                    : c.assinatura_status === 'assinado' ? 'Documento assinado ✓'
                    : 'Assinar digitalmente'}
                </span>
              </button>
            </div>

            {showPDF && (
              <PDFPreviewModal cotacaoId={id} onClose={() => setShowPDF(false)} />
            )}
            {showEmail && (
              <EmailModal
                cotacaoId={id}
                destinatarioNomePadrao={c.contato_nome as string ?? c.razao_social as string ?? ''}
                destinatarioEmailPadrao={c.contato_email as string ?? ''}
                onClose={() => setShowEmail(false)}
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

            {showPDF && (
              <PDFPreviewModal cotacaoId={id} onClose={() => setShowPDF(false)} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
