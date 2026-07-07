'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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

interface Props {
  defaultValues?: Record<string, unknown>
  onSubmit: (data: ClienteFormData) => Promise<void>
  salvando: boolean
  submitLabel?: string
}

const CAMPOS_AUTO = ['razao_social', 'nome_fantasia', 'atividade_principal', 'endereco', 'cep', 'cidade_uf'] as const

function corSituacao(s: string) {
  const v = s.toLowerCase()
  if (v.includes('ativo') || v.includes('regular')) return { bg: '#d1fae5', text: '#065f46' }
  if (v.includes('suspenso')) return { bg: '#fef3c7', text: '#92400e' }
  return { bg: '#fee2e2', text: '#991b1b' }
}

export function ClienteForm({ defaultValues, onSubmit, salvando, submitLabel = 'Salvar cliente' }: Props) {
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false)
  const [camposAuto, setCamposAuto] = useState<Set<string>>(new Set())

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: defaultValues as Partial<ClienteFormData>,
  })

  async function handleBuscarCNPJ() {
    const cnpj = getValues('cnpj')
    if (!validarCNPJ(cnpj)) return
    setBuscandoCNPJ(true)
    try {
      const dados = await buscarDadosCNPJ(cnpj)
      const pre = {
        razao_social: dados.razao_social ?? '',
        nome_fantasia: dados.nome_fantasia ?? '',
        atividade_principal: `${dados.cnae_fiscal} – ${dados.cnae_fiscal_descricao}`,
        endereco: [dados.logradouro, dados.numero, dados.complemento, dados.bairro].filter(Boolean).join(', '),
        cep: (dados.cep ?? '').replace(/^(\d{5})(\d{3})$/, '$1-$2'),
        cidade_uf: `${dados.municipio} / ${dados.uf}`,
      }
      Object.entries(pre).forEach(([k, v]) => setValue(k as keyof ClienteFormData, v))
      setCamposAuto(new Set(Object.keys(pre)))
    } catch { alert('CNPJ não encontrado na Receita Federal.') }
    setBuscandoCNPJ(false)
  }

  function abrirANTT() {
    const cnpj = getValues('cnpj').replace(/\D/g, '')
    window.open(`https://consultapublica.antt.gov.br/Site/ConsultaRNTRC.aspx${cnpj ? `?documento=${cnpj}` : ''}`, '_blank', 'noopener,noreferrer')
  }

  const inp = (style?: React.CSSProperties) => ({
    className: 'field-input',
    style: { fontSize: 13, ...style } as React.CSSProperties,
  })

  const Section = ({ title }: { title: string }) => (
    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '.6px', marginBottom: 10, marginTop: 4 }}>{title}</p>
  )

  const Field = ({ label, name, isAuto }: { label: string; name: keyof ClienteFormData; isAuto?: boolean }) => (
    <div>
      <label className="field-label">
        {label}
        {isAuto && camposAuto.has(name) && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>AUTO</span>}
      </label>
      <input {...register(name)} {...inp(camposAuto.has(name) && isAuto ? { background: 'var(--accent-light)', borderColor: 'var(--accent)' } : {})} />
      {errors[name] && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>{errors[name]?.message}</p>}
    </div>
  )

  const situacaoAtual = watch('situacao_rntrc') ?? ''

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* CNPJ */}
      <div>
        <label className="field-label">CNPJ</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input {...register('cnpj')} placeholder="00.000.000/0000-00"
            onChange={e => setValue('cnpj', formatCNPJ(e.target.value))}
            className="field-input" style={{ flex: 1, fontSize: 13 }} />
          <button type="button" onClick={handleBuscarCNPJ} disabled={buscandoCNPJ}
            className="btn-secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            <i className={`ti ${buscandoCNPJ ? 'ti-loader-2' : 'ti-search'}`} style={{ fontSize: 13 }} aria-hidden="true" />
            {buscandoCNPJ ? 'Buscando...' : 'Receita Federal'}
          </button>
        </div>
        {errors.cnpj && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>{errors.cnpj.message}</p>}
      </div>

      {/* Dados cadastrais */}
      <Section title="Dados cadastrais" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}><Field label="Razão social" name="razao_social" isAuto /></div>
        <Field label="Nome fantasia" name="nome_fantasia" isAuto />
        <Field label="Atividade principal" name="atividade_principal" isAuto />
        <div style={{ gridColumn: '1 / -1' }}><Field label="Endereço" name="endereco" isAuto /></div>
        <Field label="CEP" name="cep" isAuto />
        <Field label="Cidade / UF" name="cidade_uf" isAuto />
        <Field label="Site" name="site" />
      </div>

      {/* ANTT */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Section title="ANTT / RNTRC" />
          <button type="button" onClick={abrirANTT}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <i className="ti ti-external-link" style={{ fontSize: 13 }} aria-hidden="true" />
            Consultar no site da ANTT
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Field label="Número RNTRC" name="antt" />
          <div>
            <label className="field-label">Situação RNTRC</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select {...register('situacao_rntrc')} className="field-input" style={{ flex: 1, fontSize: 13 }}>
                <option value="">Selecione...</option>
                <option value="Ativo">Ativo</option>
                <option value="Suspenso">Suspenso</option>
                <option value="Cancelado">Cancelado</option>
                <option value="Irregular">Irregular</option>
              </select>
              {situacaoAtual && (() => { const c = corSituacao(situacaoAtual); return (
                <span style={{ background: c.bg, color: c.text, padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>{situacaoAtual}</span>
              )})()}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
          Clique em "Consultar no site da ANTT" — o CNPJ será pré-preenchido. Copie o RNTRC e a situação do site.
        </p>
      </div>

      {/* Contato */}
      <Section title="Contato" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}><Field label="Nome do contato" name="contato_nome" /></div>
        <Field label="E-mail" name="contato_email" />
        <Field label="Telefone" name="contato_telefone" />
      </div>

      {/* Observações */}
      <div>
        <label className="field-label">Observações internas</label>
        <textarea {...register('observacoes')} rows={3}
          className="field-input" style={{ resize: 'none', fontSize: 13 }} />
      </div>

      <button type="submit" disabled={salvando} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '9px 18px' }}>
        {salvando ? 'Salvando...' : submitLabel}
      </button>
    </form>
  )
}
