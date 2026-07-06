'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Loader2, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { buscarDadosCNPJ, formatCNPJ, validarCNPJ } from '@/lib/utils'

const clienteSchema = z.object({
  cnpj:                z.string().refine(validarCNPJ, 'CNPJ inválido'),
  razao_social:        z.string().min(2, 'Obrigatório'),
  nome_fantasia:       z.string().optional(),
  atividade_principal: z.string().optional(),
  endereco:            z.string().optional(),
  cep:                 z.string().optional(),
  cidade_uf:           z.string().optional(),
  site:                z.string().optional(),
  antt:                z.string().optional(),
  situacao_rntrc:      z.string().optional(),
  observacoes:         z.string().optional(),
  contato_nome:        z.string().optional(),
  contato_email:       z.string().email('E-mail inválido').optional().or(z.literal('')),
  contato_telefone:    z.string().optional(),
})

export type ClienteFormData = z.infer<typeof clienteSchema>

// Badge de cor conforme situação RNTRC
function corSituacao(situacao: string): string {
  const s = situacao.toLowerCase()
  if (s.includes('ativo') || s.includes('regular'))
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (s.includes('suspenso'))
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  if (s.includes('cancelado') || s.includes('irregular'))
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
}

interface Props {
  defaultValues?: Record<string, unknown>
  onSubmit: (data: ClienteFormData) => Promise<void>
  salvando: boolean
  submitLabel?: string
}

const CAMPOS_AUTO = ['razao_social', 'nome_fantasia', 'atividade_principal', 'endereco', 'cep', 'cidade_uf'] as const

export function ClienteForm({ defaultValues, onSubmit, salvando, submitLabel = 'Salvar cliente' }: Props) {
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false)
  const [camposAuto, setCamposAuto]     = useState<Set<string>>(new Set())
  const [situacao, setSituacao]         = useState<string>((defaultValues?.situacao_rntrc as string) ?? '')

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: defaultValues as Partial<ClienteFormData>,
  })

  // Busca dados da Receita Federal
  async function handleBuscarCNPJ() {
    const cnpj = getValues('cnpj')
    if (!validarCNPJ(cnpj)) return
    setBuscandoCNPJ(true)
    try {
      const dados = await buscarDadosCNPJ(cnpj)
      const preenchido = {
        razao_social:        dados.razao_social ?? '',
        nome_fantasia:       dados.nome_fantasia ?? '',
        atividade_principal: `${dados.cnae_fiscal} – ${dados.cnae_fiscal_descricao}`,
        endereco:            [dados.logradouro, dados.numero, dados.complemento, dados.bairro].filter(Boolean).join(', '),
        cep:                 (dados.cep ?? '').replace(/^(\d{5})(\d{3})$/, '$1-$2'),
        cidade_uf:           `${dados.municipio} / ${dados.uf}`,
      }
      Object.entries(preenchido).forEach(([k, v]) => setValue(k as keyof ClienteFormData, v))
      setCamposAuto(new Set(Object.keys(preenchido)))
    } catch {
      alert('CNPJ não encontrado na Receita Federal.')
    }
    setBuscandoCNPJ(false)
  }

  // Abre o site da ANTT com o CNPJ pré-preenchido via URL
  function abrirConsultaANTT() {
    const cnpj = getValues('cnpj')
    const digits = cnpj.replace(/\D/g, '')
    // A consulta pública da ANTT aceita o CNPJ como parâmetro na URL
    const url = digits
      ? `https://consultapublica.antt.gov.br/Site/ConsultaRNTRC.aspx?documento=${digits}`
      : 'https://consultapublica.antt.gov.br/Site/ConsultaRNTRC.aspx'
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const field = (name: keyof ClienteFormData, label: string, opts?: {
    type?: string; full?: boolean; textarea?: boolean
  }) => {
    const auto = CAMPOS_AUTO.includes(name as typeof CAMPOS_AUTO[number]) && camposAuto.has(name)
    return (
      <div className={opts?.full ? 'col-span-2' : ''}>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
          {label}
          {auto && <span className="ml-1.5 text-xs text-blue-500">auto</span>}
        </label>
        {opts?.textarea ? (
          <textarea
            {...register(name)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        ) : (
          <input
            type={opts?.type ?? 'text'}
            {...register(name)}
            className={`w-full px-3 py-2 rounded-lg border text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500
              ${auto
                ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950'
                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'}`}
          />
        )}
        {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name]?.message}</p>}
      </div>
    )
  }

  const situacaoAtual = watch('situacao_rntrc') ?? ''

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* CNPJ */}
      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">CNPJ</label>
        <div className="flex gap-2">
          <input
            {...register('cnpj')}
            placeholder="00.000.000/0000-00"
            onChange={e => setValue('cnpj', formatCNPJ(e.target.value))}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleBuscarCNPJ}
            disabled={buscandoCNPJ}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {buscandoCNPJ ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {buscandoCNPJ ? 'Buscando...' : 'Receita Federal'}
          </button>
        </div>
        {errors.cnpj && <p className="text-xs text-red-500 mt-1">{errors.cnpj.message}</p>}
      </div>

      {/* Dados cadastrais */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Dados cadastrais</p>
        <div className="grid grid-cols-2 gap-4">
          {field('razao_social',        'Razão social',        { full: true })}
          {field('nome_fantasia',        'Nome fantasia')}
          {field('atividade_principal',  'Atividade principal')}
          {field('endereco',             'Endereço',           { full: true })}
          {field('cep',                  'CEP')}
          {field('cidade_uf',            'Cidade / UF')}
          {field('site',                 'Site')}
        </div>
      </div>

      {/* ANTT / RNTRC */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">ANTT / RNTRC</p>
          <button
            type="button"
            onClick={abrirConsultaANTT}
            className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Consultar no site da ANTT
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
              Número RNTRC
            </label>
            <input
              {...register('antt')}
              placeholder="Ex: 12345678"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
              Situação RNTRC
            </label>
            <div className="flex items-center gap-2">
              <select
                {...register('situacao_rntrc')}
                onChange={e => { setValue('situacao_rntrc', e.target.value); setSituacao(e.target.value) }}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                <option value="Ativo">Ativo</option>
                <option value="Suspenso">Suspenso</option>
                <option value="Cancelado">Cancelado</option>
                <option value="Irregular">Irregular</option>
              </select>
              {situacaoAtual && (
                <span className={`text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap ${corSituacao(situacaoAtual)}`}>
                  {situacaoAtual}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Instrução */}
        <p className="text-xs text-gray-400 mt-2">
          Clique em "Consultar no site da ANTT" acima — o CNPJ será pré-preenchido automaticamente. Copie o RNTRC e a situação exibidos no site.
        </p>
      </div>

      {/* Contato */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Contato</p>
        <div className="grid grid-cols-2 gap-4">
          {field('contato_nome',     'Nome do contato', { full: true })}
          {field('contato_email',    'E-mail',          { type: 'email' })}
          {field('contato_telefone', 'Telefone')}
        </div>
      </div>

      {/* Observações */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Observações internas</p>
        <textarea
          {...register('observacoes')}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={salvando}
          className="px-5 py-2.5 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          {salvando ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
