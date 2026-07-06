'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, Lock, Unlock, AlertTriangle, Users, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Corretora {
  id: string; nome: string; cnpj: string | null
  plano_assinatura: string; plano_valor: number | null
  plano_vencimento: string | null; plano_obs: string | null
  status_assinatura: string; bloqueada: boolean
  bloqueada_motivo: string | null; criado_em: string
}

interface Membro {
  id: string
  papel: string
  convite_aceito: boolean
  usuario: { nome: string; email: string } | null
}

export default function AdminCorretoraDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params.id as string
  const supabase = createClient()

  const [corretora, setCorretora] = useState<Corretora | null>(null)
  const [membros, setMembros] = useState<Membro[]>([])
  const [metricas, setMetricas] = useState<Record<string, number>>({})
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState<Partial<Corretora>>({})
  const setF = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))
  const [aviso, setAviso] = useState(searchParams.get('novo') === '1' ? 'Corretora criada. Crie o usuário admin manualmente em Authentication → Users e vincule-o.' : '')

  useEffect(() => {
    async function carregar() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const corRes = await (supabase as any).from('corretoras').select('*').eq('id', id).single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const membRes = await (supabase as any).from('membros').select('id, papel, convite_aceito, usuario:usuarios(nome, email)').eq('corretora_id', id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metRes = await (supabase as any).from('vw_metricas_corretoras').select('total_cotacoes, cotacoes_mes_atual, total_membros').eq('id', id).single()

      if (corRes.data) {
        setCorretora(corRes.data as Corretora)
        setForm(corRes.data as Corretora)
      }
      setMembros((membRes.data ?? []) as Membro[])
      setMetricas((metRes.data ?? {}) as Record<string, number>)
    }
    carregar()
  }, [id])

  async function handleSalvar() {
    setSalvando(true)
    await supabase.from('corretoras').update({
      plano_assinatura: form.plano_assinatura,
      plano_valor: form.plano_valor,
      plano_vencimento: form.plano_vencimento || null,
      plano_obs: form.plano_obs,
      status_assinatura: form.status_assinatura,
    } as never).eq('id', id)
    setSalvando(false)
    setAviso('Salvo com sucesso!')
    setTimeout(() => setAviso(''), 3000)
  }

  async function handleBloqueio() {
    const novoEstado = !form.bloqueada
    const motivo = novoEstado ? prompt('Motivo do bloqueio:') : null
    if (novoEstado && !motivo) return
    await supabase.from('corretoras').update({
      bloqueada: novoEstado,
      bloqueada_motivo: motivo,
      status_assinatura: novoEstado ? 'cancelada' : 'ativa',
    } as never).eq('id', id)
    setForm(p => ({ ...p, bloqueada: novoEstado, status_assinatura: novoEstado ? 'cancelada' : 'ativa' }))
    setAviso(novoEstado ? 'Corretora bloqueada.' : 'Corretora desbloqueada.')
    setTimeout(() => setAviso(''), 3000)
  }

  if (!corretora) return <div className="p-6 text-sm text-gray-400">Carregando...</div>

  const PLANO_COR: Record<string, string> = {
    trial: 'bg-gray-100 text-gray-600', basico: 'bg-blue-100 text-blue-700',
    profissional: 'bg-purple-100 text-purple-700', enterprise: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{corretora.nome}</h1>
              {form.bloqueada && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-red-100 text-red-600 font-medium">Bloqueada</span>
              )}
            </div>
            <p className="text-sm text-gray-500">{corretora.cnpj ?? 'CNPJ não informado'} · desde {new Date(corretora.criado_em).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleBloqueio}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm ${form.bloqueada
              ? 'border-green-300 text-green-700 hover:bg-green-50'
              : 'border-red-300 text-red-600 hover:bg-red-50'}`}>
            {form.bloqueada ? <><Unlock className="w-3.5 h-3.5" /> Desbloquear</> : <><Lock className="w-3.5 h-3.5" /> Bloquear</>}
          </button>
          <button onClick={handleSalvar} disabled={salvando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-500 disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {aviso && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border mb-4 text-sm ${
          aviso.includes('Corretora criada') ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-green-50 border-green-200 text-green-700'}`}>
          {aviso.includes('Corretora criada') && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {aviso}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Coluna principal */}
        <div className="col-span-2 space-y-4">

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Usuários', value: metricas.total_membros ?? 0, icon: Users },
              { label: 'Cotações totais', value: metricas.total_cotacoes ?? 0, icon: FileText },
              { label: 'Cotações este mês', value: metricas.cotacoes_mes_atual ?? 0, icon: FileText },
            ].map(m => (
              <div key={m.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Plano e faturamento */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Plano e faturamento</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Plano</label>
                <select value={form.plano_assinatura ?? 'trial'} onChange={e => setF('plano_assinatura', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {['trial','basico','profissional','enterprise'].map(p => (
                    <option key={p} value={p} className="capitalize">{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select value={form.status_assinatura ?? 'ativa'} onChange={e => setF('status_assinatura', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="ativa">Ativa</option>
                  <option value="inadimplente">Inadimplente</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Valor mensal (R$)</label>
                <input type="number" value={form.plano_valor ?? ''} onChange={e => setF('plano_valor', e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vencimento</label>
                <input type="date" value={form.plano_vencimento ?? ''} onChange={e => setF('plano_vencimento', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Observações de faturamento</label>
                <input value={form.plano_obs ?? ''} onChange={e => setF('plano_obs', e.target.value)}
                  placeholder="Ex: Paga via PIX dia 5, NF emitida mensalmente"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Coluna lateral: membros */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Equipe ({membros.length})
            </h3>
            {membros.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum membro.</p>
            ) : (
              <div className="space-y-2">
                {membros.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {m.usuario?.nome?.charAt(0).toUpperCase() ?? '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{m.usuario?.nome ?? '—'}</p>
                      <p className="text-xs text-gray-400 truncate">{m.usuario?.email ?? '—'}</p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${PLANO_COR[m.papel] ?? 'bg-gray-100 text-gray-500'}`}>
                      {m.papel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ações rápidas */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Ações</h3>
            <div className="space-y-2">
              <a href={`/cotacoes`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                <FileText className="w-3.5 h-3.5" />
                Ver cotações desta corretora
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
