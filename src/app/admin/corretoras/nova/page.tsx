'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Plano {
  id: string; nome: string; nome_exibicao: string
  max_usuarios: number; max_cotacoes: number | null
  duracao_dias: number | null; valor_mensal: number; descricao: string | null
}

const dk = {
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 10, marginBottom: 14 } as React.CSSProperties,
  hdr: { display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', borderBottom: '1px solid #30363d' } as React.CSSProperties,
  body: { padding: '16px' } as React.CSSProperties,
  lbl: { display: 'block', fontSize: 11, fontWeight: 600, color: '#8b949e', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' } as React.CSSProperties,
  inp: { width: '100%', padding: '8px 11px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } as React.CSSProperties,
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 } as React.CSSProperties,
}

function F({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined, marginBottom: 2 }}>
      <label style={dk.lbl}>{label}</label>
      {children}
    </div>
  )
}

function Inp({ value, onChange, type = 'text', placeholder = '' }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={dk.inp} />
}

function Sel({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={dk.inp}>{children}</select>
}

export default function NovaCorretoraPage() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const [planos, setPlanos] = useState<Plano[]>([])
  const [planoSel, setPlanoSel] = useState<Plano | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState('')
  const [tipoCadastro, setTipoCadastro] = useState<'cnpj' | 'cpf'>('cnpj')

  const [f, setF] = useState({
    // Identificação
    cnpj: '', nome: '', nome_fantasia: '', inscricao_estadual: '',
    // Endereço
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
    // Responsável
    responsavel_nome: '', responsavel_cpf: '', responsavel_cargo: '',
    responsavel_email: '', responsavel_telefone: '',
    // Admin do sistema
    admin_nome: '', admin_email: '', admin_senha: '',
    // Plano
    plano_obs: '', dia_vencimento: '5',
    // Dados bancários
    banco_nome: '', banco_agencia: '', banco_conta: '', banco_tipo: 'corrente', banco_pix: '',
    // Observações
    observacoes_internas: '',
  })

  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    supabase.from('planos').select('*').eq('ativo', true).order('max_usuarios')
      .then(({ data }: { data: Plano[] }) => {
        setPlanos(data ?? [])
        if (data?.length) setPlanoSel(data[0])
      })
  }, [])

  function formatDoc(v: string, tipo: 'cnpj' | 'cpf') {
    const d = v.replace(/\D/g, '')
    if (tipo === 'cnpj') {
      return d.slice(0,14).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
    }
    return d.slice(0,11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1-$2')
  }

  async function buscarCNPJ() {
    const cnpjLimpo = f.cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) return
    setBuscando(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`)
      if (res.ok) {
        const d = await res.json()
        setF(p => ({
          ...p,
          nome: d.razao_social ?? p.nome,
          nome_fantasia: d.nome_fantasia ?? p.nome_fantasia,
          logradouro: d.logradouro ?? p.logradouro,
          numero: d.numero ?? p.numero,
          complemento: d.complemento ?? p.complemento,
          bairro: d.bairro ?? p.bairro,
          cidade: d.municipio ?? p.cidade,
          uf: d.uf ?? p.uf,
          cep: d.cep?.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2') ?? p.cep,
        }))
      }
    } catch { /* ignora */ }
    setBuscando(false)
  }

  async function buscarCEP() {
    const cep = f.cep.replace(/\D/g, '')
    if (cep.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      if (res.ok) {
        const d = await res.json()
        if (!d.erro) setF(p => ({ ...p, logradouro: d.logradouro ?? p.logradouro, bairro: d.bairro ?? p.bairro, cidade: d.localidade ?? p.cidade, uf: d.uf ?? p.uf }))
      }
    } catch { /* ignora */ }
  }

  async function handleSalvar() {
    if (!f.nome) { setErro('Razão social / nome é obrigatório.'); return }
    if (!planoSel) { setErro('Selecione um plano.'); return }
    if (!f.admin_nome || !f.admin_email || !f.admin_senha) { setErro('Preencha os dados do administrador.'); return }
    if (f.admin_senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    setSalvando(true); setErro('')
    try {
      const res = await fetch('/api/criar-corretora', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: f.nome, cnpj: f.cnpj || null, plano_id: planoSel.id, plano_obs: f.plano_obs || null,
          admin_nome: f.admin_nome, admin_email: f.admin_email, admin_senha: f.admin_senha,
          // Campos extras
          nome_fantasia: f.nome_fantasia || null, inscricao_estadual: f.inscricao_estadual || null,
          cep: f.cep || null, logradouro: f.logradouro || null, numero: f.numero || null,
          complemento: f.complemento || null, bairro: f.bairro || null, cidade: f.cidade || null, uf: f.uf || null,
          responsavel_nome: f.responsavel_nome || null, responsavel_cpf: f.responsavel_cpf || null,
          responsavel_cargo: f.responsavel_cargo || null, responsavel_email: f.responsavel_email || null,
          responsavel_telefone: f.responsavel_telefone || null,
          banco_nome: f.banco_nome || null, banco_agencia: f.banco_agencia || null,
          banco_conta: f.banco_conta || null, banco_tipo: f.banco_tipo || null, banco_pix: f.banco_pix || null,
          dia_vencimento: f.dia_vencimento ? Number(f.dia_vencimento) : 5,
          observacoes_internas: f.observacoes_internas || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? 'Erro ao criar.'); setSalvando(false); return }
      router.push(`/admin/corretoras/${data.corretora_id}?criada=1`)
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro.'); setSalvando(false) }
  }

  return (
    <div style={{ padding: 20, maxWidth: 780, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.back()}
          style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #30363d', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8b949e', flexShrink: 0 }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 15 }} aria-hidden="true" />
        </button>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3', margin: 0 }}>Nova corretora</h1>
          <p style={{ fontSize: 12, color: '#8b949e', marginTop: 3 }}>Preencha os dados cadastrais completos</p>
        </div>
      </div>

      {/* Tipo de cadastro */}
      <div style={dk.card}>
        <div style={dk.hdr}>
          <i className="ti ti-id-badge" style={{ fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Tipo de cadastro</span>
        </div>
        <div style={{ ...dk.body, display: 'flex', gap: 10 }}>
          {(['cnpj', 'cpf'] as const).map(tipo => (
            <button key={tipo} onClick={() => { setTipoCadastro(tipo); setF(p => ({ ...p, cnpj: '' })) }}
              style={{ flex: 1, padding: '12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', border: `2px solid ${tipoCadastro === tipo ? '#7c3aed' : '#30363d'}`, background: tipoCadastro === tipo ? '#1a0f3c' : '#0d1117' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <i className={`ti ${tipo === 'cnpj' ? 'ti-building' : 'ti-user'}`} style={{ fontSize: 16, color: tipoCadastro === tipo ? '#a78bfa' : '#484f58' }} aria-hidden="true" />
                <span style={{ fontSize: 13, fontWeight: 600, color: tipoCadastro === tipo ? '#e6edf3' : '#8b949e' }}>
                  {tipo === 'cnpj' ? 'Pessoa Jurídica (CNPJ)' : 'Pessoa Física (CPF)'}
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#8b949e', margin: 0 }}>
                {tipo === 'cnpj' ? 'Busca automática dos dados na Receita Federal' : 'Preenchimento manual dos dados'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Dados de identificação */}
      <div style={dk.card}>
        <div style={dk.hdr}>
          <i className="ti ti-building" style={{ fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Dados de identificação</span>
        </div>
        <div style={{ ...dk.body, ...dk.grid2 }}>
          <F label={tipoCadastro === 'cnpj' ? 'CNPJ *' : 'CPF *'}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={f.cnpj} onChange={e => set('cnpj', formatDoc(e.target.value, tipoCadastro))}
                placeholder={tipoCadastro === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                style={{ ...dk.inp, flex: 1 }}
                onBlur={() => tipoCadastro === 'cnpj' && buscarCNPJ()} />
              {tipoCadastro === 'cnpj' && (
                <button onClick={buscarCNPJ} disabled={buscando || f.cnpj.replace(/\D/g,'').length !== 14}
                  style={{ padding: '8px 12px', background: '#21262d', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', opacity: f.cnpj.replace(/\D/g,'').length !== 14 ? .5 : 1 }}>
                  {buscando ? '...' : 'Buscar'}
                </button>
              )}
            </div>
          </F>
          <F label="Inscrição estadual">
            <Inp value={f.inscricao_estadual} onChange={v => set('inscricao_estadual', v)} />
          </F>
          <F label={tipoCadastro === 'cnpj' ? 'Razão social *' : 'Nome completo *'} span={2}>
            <Inp value={f.nome} onChange={v => set('nome', v)} placeholder={tipoCadastro === 'cnpj' ? 'Razão social conforme CNPJ' : 'Nome completo'} />
          </F>
          {tipoCadastro === 'cnpj' && (
            <F label="Nome fantasia" span={2}>
              <Inp value={f.nome_fantasia} onChange={v => set('nome_fantasia', v)} placeholder="Nome comercial" />
            </F>
          )}
        </div>
      </div>

      {/* Endereço */}
      <div style={dk.card}>
        <div style={dk.hdr}>
          <i className="ti ti-map-pin" style={{ fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Endereço</span>
        </div>
        <div style={{ ...dk.body, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <F label="CEP">
            <input value={f.cep} onChange={e => set('cep', e.target.value)} onBlur={buscarCEP}
              placeholder="00000-000" style={dk.inp} />
          </F>
          <F label="UF">
            <Inp value={f.uf} onChange={v => set('uf', v)} placeholder="SP" />
          </F>
          <F label="Cidade">
            <Inp value={f.cidade} onChange={v => set('cidade', v)} />
          </F>
          <F label="Logradouro" span={2}>
            <Inp value={f.logradouro} onChange={v => set('logradouro', v)} placeholder="Rua, Avenida..." />
          </F>
          <F label="Número">
            <Inp value={f.numero} onChange={v => set('numero', v)} />
          </F>
          <F label="Complemento">
            <Inp value={f.complemento} onChange={v => set('complemento', v)} placeholder="Sala, Andar..." />
          </F>
          <F label="Bairro" span={2}>
            <Inp value={f.bairro} onChange={v => set('bairro', v)} />
          </F>
        </div>
      </div>

      {/* Responsável */}
      <div style={dk.card}>
        <div style={dk.hdr}>
          <i className="ti ti-user-check" style={{ fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Responsável</span>
        </div>
        <div style={{ ...dk.body, ...dk.grid2 }}>
          <F label="Nome do responsável">
            <Inp value={f.responsavel_nome} onChange={v => set('responsavel_nome', v)} />
          </F>
          <F label="CPF do responsável">
            <Inp value={f.responsavel_cpf} onChange={v => set('responsavel_cpf', formatDoc(v, 'cpf'))} placeholder="000.000.000-00" />
          </F>
          <F label="Cargo">
            <Inp value={f.responsavel_cargo} onChange={v => set('responsavel_cargo', v)} placeholder="Sócio, Diretor..." />
          </F>
          <F label="Telefone">
            <Inp value={f.responsavel_telefone} onChange={v => set('responsavel_telefone', v)} placeholder="(00) 00000-0000" />
          </F>
          <F label="E-mail do responsável" span={2}>
            <Inp type="email" value={f.responsavel_email} onChange={v => set('responsavel_email', v)} />
          </F>
        </div>
      </div>

      {/* Dados bancários */}
      <div style={dk.card}>
        <div style={dk.hdr}>
          <i className="ti ti-building-bank" style={{ fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Dados bancários</span>
        </div>
        <div style={{ ...dk.body, ...dk.grid2 }}>
          <F label="Banco">
            <Inp value={f.banco_nome} onChange={v => set('banco_nome', v)} placeholder="Ex: Itaú, Bradesco, Nubank" />
          </F>
          <F label="Tipo de conta">
            <Sel value={f.banco_tipo} onChange={v => set('banco_tipo', v)}>
              <option value="corrente">Conta corrente</option>
              <option value="poupanca">Conta poupança</option>
              <option value="pix">Somente PIX</option>
            </Sel>
          </F>
          <F label="Agência">
            <Inp value={f.banco_agencia} onChange={v => set('banco_agencia', v)} />
          </F>
          <F label="Conta">
            <Inp value={f.banco_conta} onChange={v => set('banco_conta', v)} />
          </F>
          <F label="Chave PIX" span={2}>
            <Inp value={f.banco_pix} onChange={v => set('banco_pix', v)} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" />
          </F>
        </div>
      </div>

      {/* Plano */}
      <div style={dk.card}>
        <div style={dk.hdr}>
          <i className="ti ti-crown" style={{ fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Plano *</span>
        </div>
        <div style={dk.body}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
            {planos.map(p => (
              <button key={p.id} onClick={() => setPlanoSel(p)} type="button"
                style={{ padding: '12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', border: `2px solid ${planoSel?.id === p.id ? '#7c3aed' : '#30363d'}`, background: planoSel?.id === p.id ? '#1a0f3c' : '#0d1117' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', margin: '0 0 4px' }}>{p.nome_exibicao}</p>
                <p style={{ fontSize: 11, color: '#8b949e', margin: '0 0 2px' }}>{p.max_usuarios} usuários</p>
                {p.max_cotacoes && <p style={{ fontSize: 11, color: '#8b949e', margin: '0 0 2px' }}>{p.max_cotacoes} cotações/mês</p>}
                {p.duracao_dias && <p style={{ fontSize: 11, color: '#f59e0b', margin: '0 0 2px' }}>{p.duracao_dias} dias</p>}
                <p style={{ fontSize: 11, color: '#8b949e', margin: 0 }}>{p.valor_mensal > 0 ? `R$ ${Number(p.valor_mensal).toFixed(2)}/mês` : 'Gratuito'}</p>
              </button>
            ))}
          </div>
          <div style={dk.grid2}>
            <F label="Dia de cobrança">
              <Sel value={f.dia_vencimento} onChange={v => set('dia_vencimento', v)}>
                {[1,5,10,15,20,25,28].map(d => <option key={d} value={String(d)}>Dia {d}</option>)}
              </Sel>
            </F>
            <F label="Observações de faturamento">
              <Inp value={f.plano_obs} onChange={v => set('plano_obs', v)} placeholder="Ex: Paga via PIX" />
            </F>
          </div>
        </div>
      </div>

      {/* Administrador */}
      <div style={dk.card}>
        <div style={dk.hdr}>
          <i className="ti ti-shield-check" style={{ fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Administrador da corretora *</span>
        </div>
        <div style={{ ...dk.body, ...dk.grid2 }}>
          <F label="Nome completo *">
            <Inp value={f.admin_nome} onChange={v => set('admin_nome', v)} placeholder="Nome do administrador" />
          </F>
          <F label="E-mail *">
            <Inp type="email" value={f.admin_email} onChange={v => set('admin_email', v)} placeholder="admin@corretora.com.br" />
          </F>
          <F label="Senha inicial * (mín. 6 caracteres)" span={2}>
            <Inp type="password" value={f.admin_senha} onChange={v => set('admin_senha', v)} placeholder="Senha para primeiro acesso" />
          </F>
        </div>
        <p style={{ fontSize: 11, color: '#484f58', padding: '0 16px 14px' }}>
          Este usuário terá acesso total à corretora e poderá gerenciar a equipe, configurações e cotações.
        </p>
      </div>

      {/* Observações internas */}
      <div style={dk.card}>
        <div style={dk.hdr}>
          <i className="ti ti-notes" style={{ fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Observações internas</span>
        </div>
        <div style={dk.body}>
          <textarea value={f.observacoes_internas} onChange={e => set('observacoes_internas', e.target.value)}
            rows={3} placeholder="Anotações internas sobre esta corretora (não visível para o cliente)"
            style={{ ...dk.inp, resize: 'vertical' }} />
        </div>
      </div>

      {/* Erro e botão */}
      {erro && (
        <div style={{ background: '#2d0e0e', border: '1px solid #f85149', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#f85149', marginBottom: 14 }}>
          {erro}
        </div>
      )}
      <button onClick={handleSalvar} disabled={salvando || !planoSel}
        style={{ width: '100%', padding: '12px', background: salvando ? '#5b21b6' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: !planoSel ? .6 : 1 }}>
        <i className="ti ti-building-plus" style={{ fontSize: 16 }} aria-hidden="true" />
        {salvando ? 'Criando corretora...' : 'Criar corretora'}
      </button>
    </div>
  )
}
