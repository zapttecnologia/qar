'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buscarDadosCNPJ, formatCNPJ, validarCNPJ } from '@/lib/utils'

export default function NovaCorretoraPage() {
  const router = useRouter()
  const supabase = createClient()
  const [salvando, setSalvando] = useState(false)
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    nome: '', cnpj: '', plano_assinatura: 'trial',
    plano_valor: '', plano_vencimento: '', plano_obs: '',
    // Admin da corretora
    admin_nome: '', admin_email: '', admin_senha: '',
  })
  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleBuscarCNPJ() {
    if (!validarCNPJ(form.cnpj)) return
    setBuscandoCNPJ(true)
    try {
      const dados = await buscarDadosCNPJ(form.cnpj)
      setF('nome', dados.nome_fantasia || dados.razao_social || '')
    } catch { /* ignora */ }
    setBuscandoCNPJ(false)
  }

  async function handleSalvar() {
    if (!form.nome || !form.admin_email || !form.admin_senha) {
      setErro('Preencha nome da corretora, e-mail e senha do admin.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      // 1. Cria a corretora
      const { data: corretora, error: errCor } = await supabase
        .from('corretoras')
        .insert({
          nome: form.nome,
          cnpj: form.cnpj || null,
          plano_assinatura: form.plano_assinatura,
          plano_valor: form.plano_valor ? Number(form.plano_valor) : null,
          plano_vencimento: form.plano_vencimento || null,
          plano_obs: form.plano_obs || null,
          status_assinatura: 'ativa',
        } as never)
        .select()
        .single()

      if (errCor) throw new Error(errCor.message)

      // 2. Cria o usuário admin via Supabase Auth Admin
      // (usa service role — precisa ser feito via API Route em produção)
      // Por ora, instrui o admin a criar manualmente
      const cor = corretora as Record<string, unknown>
      router.push(`/admin/corretoras/${cor.id}?novo=1&admin_email=${encodeURIComponent(form.admin_email)}&admin_nome=${encodeURIComponent(form.admin_nome)}`)

    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    }
    setSalvando(false)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Nova corretora</h1>
      </div>

      <div className="space-y-4">
        {/* Dados da corretora */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Dados da corretora</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">CNPJ</label>
              <div className="flex gap-2">
                <input value={form.cnpj} onChange={e => setF('cnpj', formatCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <button onClick={handleBuscarCNPJ} disabled={buscandoCNPJ || !validarCNPJ(form.cnpj)}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  {buscandoCNPJ ? '...' : 'Buscar'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome da corretora <span className="text-red-500">*</span></label>
              <input value={form.nome} onChange={e => setF('nome', e.target.value)}
                placeholder="Nome completo da corretora"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
        </div>

        {/* Plano */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Plano e faturamento</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Plano</label>
              <select value={form.plano_assinatura} onChange={e => setF('plano_assinatura', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="trial">Trial (gratuito)</option>
                <option value="basico">Básico</option>
                <option value="profissional">Profissional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valor mensal (R$)</label>
              <input value={form.plano_valor} onChange={e => setF('plano_valor', e.target.value)}
                type="number" placeholder="0,00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vencimento do plano</label>
              <input value={form.plano_vencimento} onChange={e => setF('plano_vencimento', e.target.value)}
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Observações de faturamento</label>
              <input value={form.plano_obs} onChange={e => setF('plano_obs', e.target.value)}
                placeholder="Ex: Paga via PIX dia 5"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
        </div>

        {/* Admin da corretora */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Admin da corretora</h2>
          <p className="text-xs text-gray-400 mb-4">Usuário que vai gerenciar essa corretora.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome</label>
              <input value={form.admin_nome} onChange={e => setF('admin_nome', e.target.value)}
                placeholder="Nome completo"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">E-mail <span className="text-red-500">*</span></label>
              <input value={form.admin_email} onChange={e => setF('admin_email', e.target.value)}
                type="email" placeholder="admin@corretora.com.br"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Senha inicial <span className="text-red-500">*</span></label>
              <input value={form.admin_senha} onChange={e => setF('admin_senha', e.target.value)}
                type="password" placeholder="Mínimo 8 caracteres"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {erro}
          </div>
        )}

        <button onClick={handleSalvar} disabled={salvando}
          className="w-full py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 disabled:opacity-50">
          {salvando ? 'Criando corretora...' : 'Criar corretora'}
        </button>
      </div>
    </div>
  )
}
