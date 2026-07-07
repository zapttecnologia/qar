'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buscarDadosCNPJ, formatCNPJ, validarCNPJ } from '@/lib/utils'

interface Plano {
  id: string; nome: string; nome_exibicao: string
  max_usuarios: number; duracao_dias: number | null
  valor_mensal: number; descricao: string | null
}

const dark = {
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 10, marginBottom: 14 } as React.CSSProperties,
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid #30363d' } as React.CSSProperties,
  body: { padding: 16 } as React.CSSProperties,
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#8b949e', marginBottom: 5 } as React.CSSProperties,
  input: { width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><label style={dark.label}>{label}</label>{children}</div>
}

export default function NovaCorretoraPage() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const [planos, setPlanos] = useState<Plano[]>([])
  const [planoSel, setPlanoSel] = useState<Plano | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({ nome: '', cnpj: '', plano_obs: '', admin_nome: '', admin_email: '', admin_senha: '' })
  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    supabase.from('planos').select('*').eq('ativo', true).order('max_usuarios')
      .then(({ data }: { data: Plano[] }) => {
        setPlanos(data ?? [])
        if (data?.length) setPlanoSel(data[0])
      })
  }, [])

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
    if (!form.nome || !planoSel || !form.admin_nome || !form.admin_email || !form.admin_senha) {
      setErro('Preencha todos os campos obrigatórios.'); return
    }
    if (form.admin_senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.'); return
    }
    setSalvando(true); setErro('')
    try {
      const res = await fetch('/api/criar-corretora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          cnpj: form.cnpj || null,
          plano_id: planoSel.id,
          plano_obs: form.plano_obs || null,
          admin_nome: form.admin_nome,
          admin_email: form.admin_email,
          admin_senha: form.admin_senha,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? 'Erro ao criar corretora.'); setSalvando(false); return }
      router.push(`/admin/corretoras/${data.corretora_id}?criada=1`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
      setSalvando(false)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: '1px solid #30363d', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8b949e' }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 15 }} aria-hidden="true" />
        </button>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3' }}>Nova corretora</h1>
          <p style={{ fontSize: 12, color: '#8b949e', marginTop: 3 }}>Preencha os dados e crie o administrador</p>
        </div>
      </div>

      {/* Dados da corretora */}
      <div style={dark.card}>
        <div style={dark.header}>
          <i className="ti ti-building" style={{ fontSize: 15, color: '#8b949e' }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Dados da corretora</span>
        </div>
        <div style={dark.body}>
          <Field label="CNPJ">
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={form.cnpj} onChange={e => setF('cnpj', formatCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00" style={{ ...dark.input, flex: 1 }} />
              <button onClick={handleBuscarCNPJ} disabled={buscandoCNPJ || !validarCNPJ(form.cnpj)}
                style={{ padding: '8px 12px', background: '#21262d', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 12, cursor: 'pointer', opacity: (!validarCNPJ(form.cnpj) || buscandoCNPJ) ? .5 : 1, whiteSpace: 'nowrap' }}>
                {buscandoCNPJ ? '...' : 'Buscar'}
              </button>
            </div>
          </Field>
          <Field label="Nome da corretora *">
            <input value={form.nome} onChange={e => setF('nome', e.target.value)}
              placeholder="Nome completo da corretora" style={dark.input} />
          </Field>
        </div>
      </div>

      {/* Seleção de plano */}
      <div style={dark.card}>
        <div style={dark.header}>
          <i className="ti ti-crown" style={{ fontSize: 15, color: '#8b949e' }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Plano *</span>
        </div>
        <div style={dark.body}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
            {planos.map(p => (
              <button key={p.id} onClick={() => setPlanoSel(p)} type="button"
                style={{
                  padding: '12px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                  border: `2px solid ${planoSel?.id === p.id ? '#7c3aed' : '#30363d'}`,
                  background: planoSel?.id === p.id ? '#1a0f3c' : '#0d1117',
                }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>{p.nome_exibicao}</p>
                <p style={{ fontSize: 11, color: '#8b949e' }}>{p.max_usuarios} usuário{p.max_usuarios !== 1 ? 's' : ''}</p>
                {p.duracao_dias && <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>{p.duracao_dias} dias</p>}
                <p style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>{p.valor_mensal > 0 ? `R$ ${Number(p.valor_mensal).toFixed(2)}/mês` : 'Gratuito'}</p>
              </button>
            ))}
          </div>

          {planoSel && (
            <div style={{ background: '#0d1117', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#8b949e' }}>
              <strong style={{ color: '#e6edf3' }}>{planoSel.nome_exibicao}:</strong>{' '}
              {planoSel.descricao ?? `Até ${planoSel.max_usuarios} usuários`}
              {planoSel.duracao_dias && ` · Expira em ${planoSel.duracao_dias} dias`}
            </div>
          )}

          <Field label="Observações de faturamento">
            <input value={form.plano_obs} onChange={e => setF('plano_obs', e.target.value)}
              placeholder="Ex: Paga via PIX dia 5" style={dark.input} />
          </Field>
        </div>
      </div>

      {/* Admin da corretora */}
      <div style={dark.card}>
        <div style={dark.header}>
          <i className="ti ti-shield-check" style={{ fontSize: 15, color: '#8b949e' }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Administrador da corretora</span>
        </div>
        <div style={dark.body}>
          <p style={{ fontSize: 12, color: '#8b949e', marginBottom: 14 }}>
            Este usuário terá acesso total à corretora e poderá gerenciar a equipe, configurações e cotações.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Nome completo *">
              <input value={form.admin_nome} onChange={e => setF('admin_nome', e.target.value)}
                placeholder="Nome do administrador" style={dark.input} />
            </Field>
            <Field label="E-mail *">
              <input type="email" value={form.admin_email} onChange={e => setF('admin_email', e.target.value)}
                placeholder="admin@corretora.com.br" style={dark.input} />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Senha inicial * (mín. 6 caracteres)">
                <input type="password" value={form.admin_senha} onChange={e => setF('admin_senha', e.target.value)}
                  placeholder="Senha para primeiro acesso" style={dark.input} />
              </Field>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#484f58', marginTop: 4 }}>
            O usuário poderá alterar a senha após o primeiro login.
          </p>
        </div>
      </div>

      {erro && (
        <div style={{ background: '#2d0e0e', border: '1px solid #f85149', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#f85149', marginBottom: 14 }}>
          {erro}
        </div>
      )}

      <button onClick={handleSalvar} disabled={salvando || !planoSel}
        style={{ width: '100%', padding: '11px 14px', background: salvando ? '#5b21b6' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <i className="ti ti-building-plus" style={{ fontSize: 16 }} aria-hidden="true" />
        {salvando ? 'Criando corretora e usuário admin...' : 'Criar corretora'}
      </button>
    </div>
  )
}
