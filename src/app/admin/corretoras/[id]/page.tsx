'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Corretora {
  id: string; nome: string; nome_fantasia: string | null; cnpj: string | null
  inscricao_estadual: string | null; plano_assinatura: string; plano_id: string | null
  plano_valor: number | null; plano_vencimento: string | null; plano_obs: string | null
  status_assinatura: string; dia_vencimento: number | null
  bloqueada: boolean; bloqueada_motivo: string | null
  suspenso: boolean; suspenso_em: string | null
  cep: string | null; logradouro: string | null; numero: string | null
  complemento: string | null; bairro: string | null; cidade: string | null; uf: string | null
  responsavel_nome: string | null; responsavel_cpf: string | null; responsavel_cargo: string | null
  responsavel_email: string | null; responsavel_telefone: string | null
  banco_nome: string | null; banco_agencia: string | null; banco_conta: string | null
  banco_tipo: string | null; banco_pix: string | null; observacoes_internas: string | null
  criado_em: string
}
interface Membro { id: string; papel: string; convite_aceito: boolean; usuario: { nome: string; email: string } | null }
interface Plano { id: string; nome: string; nome_exibicao: string; max_usuarios: number; max_cotacoes: number | null; duracao_dias: number | null; valor_mensal: number }

const dk = {
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 10, marginBottom: 14 } as React.CSSProperties,
  hdr: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #30363d' } as React.CSSProperties,
  body: { padding: 16 } as React.CSSProperties,
  lbl: { fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 5 } as React.CSSProperties,
  inp: { width: '100%', padding: '8px 10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  t1: { color: '#e6edf3' }, t2: { color: '#8b949e' },
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <span style={dk.lbl}>{label}</span>
      <p style={{ fontSize: 13, ...dk.t1, margin: 0 }}>{value}</p>
    </div>
  )
}

function Fld({ label, k, form, setForm, type = 'text' }: { label: string; k: string; form: Record<string,string|number|boolean|null>; setForm: (f: (p: Record<string,string|number|boolean|null>) => Record<string,string|number|boolean|null>) => void; type?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={dk.lbl}>{label}</label>
      <input type={type} value={String(form[k] ?? '')} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} style={dk.inp} />
    </div>
  )
}

export default function CorretoraDetalhePage() {
  const params = useParams()
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createClient() as any
  const id = params.id as string

  const [corretora, setCorretora] = useState<Corretora | null>(null)
  const [membros, setMembros] = useState<Membro[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])
  const [metricas, setMetricas] = useState<Record<string, number>>({})
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string|number|boolean|null>>({})
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  // Novo usuário
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [novoPapel, setNovoPapel] = useState('admin')
  const [criando, setCriando] = useState(false)
  const [erroUsuario, setErroUsuario] = useState('')
  const [okUsuario, setOkUsuario] = useState('')

  async function carregar() {
    const [corrRes, memRes, metRes, planRes] = await Promise.all([
      sb.from('corretoras').select('*').eq('id', id).single(),
      sb.from('membros').select('id, papel, convite_aceito, usuario:usuarios(nome, email)').eq('corretora_id', id),
      sb.from('vw_metricas_corretoras').select('total_cotacoes, cotacoes_mes_atual, total_membros, valor_pendente, receita_ano').eq('id', id).single(),
      sb.from('planos').select('*').eq('ativo', true).order('max_usuarios'),
    ])
    if (corrRes.data) { setCorretora(corrRes.data as Corretora); setForm(corrRes.data as Record<string, string|number|boolean|null>) }
    setMembros(memRes.data ?? [])
    setMetricas(metRes.data ?? {})
    setPlanos(planRes.data ?? [])
  }

  useEffect(() => { carregar() }, [id])

  async function salvarSecao(secao: string) {
    setSalvando(true)
    const campos: Record<string, string[]> = {
      dados: ['nome','nome_fantasia','cnpj','inscricao_estadual'],
      endereco: ['cep','logradouro','numero','complemento','bairro','cidade','uf'],
      responsavel: ['responsavel_nome','responsavel_cpf','responsavel_cargo','responsavel_email','responsavel_telefone'],
      banco: ['banco_nome','banco_agencia','banco_conta','banco_tipo','banco_pix'],
      plano: ['plano_id','plano_assinatura','plano_valor','plano_vencimento','plano_obs','status_assinatura','dia_vencimento'],
      obs: ['observacoes_internas'],
    }
    const payload: Record<string, unknown> = {}
    campos[secao]?.forEach(k => { payload[k] = form[k] ?? null })
    await sb.from('corretoras').update(payload).eq('id', id)
    setEditando(null)
    await carregar()
    setMsg('Salvo!')
    setTimeout(() => setMsg(''), 2000)
    setSalvando(false)
  }

  async function toggleBloqueio() {
    const novo = !corretora?.bloqueada
    const motivo = novo ? prompt('Motivo do bloqueio:') : null
    if (novo && !motivo) return
    await sb.from('corretoras').update({ bloqueada: novo, bloqueada_motivo: motivo, status_assinatura: novo ? 'cancelada' : 'ativa' }).eq('id', id)
    await carregar()
  }

  async function toggleSuspensao() {
    const novo = !corretora?.suspenso
    await sb.from('corretoras').update({ suspenso: novo, suspenso_em: novo ? new Date().toISOString() : null }).eq('id', id)
    await carregar()
  }

  async function excluirCorretora() {
    if (!confirm(`ATENÇÃO: Isso marcará a corretora "${corretora?.nome}" como excluída. Os dados serão preservados mas ela não aparecerá mais no sistema.\n\nConfirmar?`)) return
    await sb.from('corretoras').update({ excluido: true, excluido_em: new Date().toISOString(), status_assinatura: 'cancelada' }).eq('id', id)
    router.push('/admin/corretoras')
  }

  async function handleCriarUsuario() {
    if (!novoNome || !novoEmail || !novaSenha) { setErroUsuario('Preencha todos os campos.'); return }
    setCriando(true); setErroUsuario(''); setOkUsuario('')
    const res = await fetch('/api/criar-usuario', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome, email: novoEmail, senha: novaSenha, papel: novoPapel, corretora_id: id }),
    })
    const data = await res.json()
    if (!res.ok) { setErroUsuario(data.error ?? 'Erro.'); setCriando(false); return }
    setOkUsuario(`✓ ${novoNome} adicionado como ${novoPapel}.`)
    setNovoNome(''); setNovoEmail(''); setNovaSenha('')
    await carregar()
    setCriando(false)
  }

  async function removerMembro(memId: string) {
    if (!confirm('Remover este membro?')) return
    await sb.from('membros').delete().eq('id', memId)
    await carregar()
  }

  const PAPEL_COR: Record<string, { bg: string; text: string }> = {
    admin: { bg: '#2d0e0e', text: '#f85149' }, aprovador: { bg: '#0d1f3c', text: '#58a6ff' },
    corretor: { bg: '#0d2b1a', text: '#3fb950' }, visualizador: { bg: '#21262d', text: '#8b949e' },
  }

  function SecHeader({ label, icon, secao }: { label: string; icon: string; secao: string }) {
    return (
      <div style={dk.hdr}>
        <i className={`ti ${icon}`} style={{ fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
        <span style={{ fontSize: 13, fontWeight: 600, ...dk.t1, flex: 1 }}>{label}</span>
        {editando === secao ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => salvarSecao(secao)} disabled={salvando} style={{ padding: '5px 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>
              {salvando ? '...' : 'Salvar'}
            </button>
            <button onClick={() => setEditando(null)} style={{ padding: '5px 12px', background: 'none', border: '1px solid #30363d', borderRadius: 5, fontSize: 12, color: '#8b949e', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        ) : (
          <button onClick={() => setEditando(secao)} style={{ padding: '5px 10px', background: 'none', border: '1px solid #30363d', borderRadius: 5, fontSize: 12, color: '#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-pencil" style={{ fontSize: 12 }} aria-hidden="true" /> Editar
          </button>
        )}
      </div>
    )
  }

  if (!corretora) return <div style={{ padding: 40, textAlign: 'center', ...dk.t2, fontSize: 13 }}>Carregando...</div>

  return (
    <div style={{ padding: 20, maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: '1px solid #30363d', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8b949e' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 15 }} aria-hidden="true" />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 16, fontWeight: 600, ...dk.t1, margin: 0 }}>{corretora.nome}</h1>
              {corretora.bloqueada && <span style={{ background: '#2d0e0e', color: '#f85149', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>BLOQUEADA</span>}
              {corretora.suspenso && <span style={{ background: '#2d1a00', color: '#f59e0b', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>SUSPENSA</span>}
            </div>
            <p style={{ fontSize: 12, ...dk.t2, margin: '3px 0 0' }}>{corretora.cnpj ?? 'Sem CNPJ'} · Cadastrada em {new Date(corretora.criado_em).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {msg && <span style={{ fontSize: 12, color: '#3fb950', alignSelf: 'center' }}>{msg}</span>}
          <button onClick={toggleSuspensao} style={{ padding: '7px 12px', background: 'none', border: `1px solid ${corretora.suspenso ? '#3fb950' : '#f59e0b'}`, borderRadius: 6, color: corretora.suspenso ? '#3fb950' : '#f59e0b', fontSize: 12, cursor: 'pointer' }}>
            <i className={`ti ${corretora.suspenso ? 'ti-player-play' : 'ti-pause'}`} style={{ fontSize: 12 }} aria-hidden="true" /> {corretora.suspenso ? 'Reativar' : 'Suspender'}
          </button>
          <button onClick={toggleBloqueio} style={{ padding: '7px 12px', background: 'none', border: `1px solid ${corretora.bloqueada ? '#3fb950' : '#f85149'}`, borderRadius: 6, color: corretora.bloqueada ? '#3fb950' : '#f85149', fontSize: 12, cursor: 'pointer' }}>
            <i className={`ti ${corretora.bloqueada ? 'ti-lock-open' : 'ti-lock'}`} style={{ fontSize: 12 }} aria-hidden="true" /> {corretora.bloqueada ? 'Desbloquear' : 'Bloquear'}
          </button>
          <button onClick={excluirCorretora} style={{ padding: '7px 12px', background: 'none', border: '1px solid #30363d', borderRadius: 6, color: '#484f58', fontSize: 12, cursor: 'pointer' }}>
            <i className="ti ti-trash" style={{ fontSize: 12 }} aria-hidden="true" /> Excluir
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 20 }}>
        {[
          ['Usuários', metricas.total_membros ?? 0, 'ti-users', '#58a6ff'],
          ['Cotações', metricas.total_cotacoes ?? 0, 'ti-file-text', '#a78bfa'],
          ['Este mês', metricas.cotacoes_mes_atual ?? 0, 'ti-calendar', '#f59e0b'],
          ['A receber', `R$ ${Number(metricas.valor_pendente ?? 0).toFixed(2)}`, 'ti-coin', '#f59e0b'],
          ['Receita/ano', `R$ ${Number(metricas.receita_ano ?? 0).toFixed(2)}`, 'ti-trending-up', '#3fb950'],
        ].map(([lbl, val, icon, cor]) => (
          <div key={lbl as string} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <i className={`ti ${icon}`} style={{ fontSize: 13, color: cor as string }} aria-hidden="true" />
              <span style={{ fontSize: 10, ...dk.t2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>{lbl as string}</span>
            </div>
            <p style={{ fontSize: 18, fontWeight: 600, ...dk.t1, margin: 0 }}>{val as string}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* Coluna principal */}
        <div>
          {/* Dados cadastrais */}
          <div style={dk.card}>
            <SecHeader label="Dados cadastrais" icon="ti-building" secao="dados" />
            <div style={dk.body}>
              {editando === 'dados' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <Fld label="Razão social *" k="nome" form={form} setForm={setForm} />
                  <Fld label="Nome fantasia" k="nome_fantasia" form={form} setForm={setForm} />
                  <Fld label="CNPJ" k="cnpj" form={form} setForm={setForm} />
                  <Fld label="Inscrição estadual" k="inscricao_estadual" form={form} setForm={setForm} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <Field label="Razão social" value={corretora.nome} />
                  <Field label="Nome fantasia" value={corretora.nome_fantasia} />
                  <Field label="CNPJ" value={corretora.cnpj} />
                  <Field label="Inscrição estadual" value={corretora.inscricao_estadual} />
                </div>
              )}
            </div>
          </div>

          {/* Endereço */}
          <div style={dk.card}>
            <SecHeader label="Endereço" icon="ti-map-pin" secao="endereco" />
            <div style={dk.body}>
              {editando === 'endereco' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
                  <div style={{ gridColumn: '1 / -1' }}><Fld label="CEP" k="cep" form={form} setForm={setForm} /></div>
                  <div style={{ gridColumn: '1 / 3' }}><Fld label="Logradouro" k="logradouro" form={form} setForm={setForm} /></div>
                  <Fld label="Número" k="numero" form={form} setForm={setForm} />
                  <Fld label="Complemento" k="complemento" form={form} setForm={setForm} />
                  <Fld label="Bairro" k="bairro" form={form} setForm={setForm} />
                  <Fld label="Cidade" k="cidade" form={form} setForm={setForm} />
                  <Fld label="UF" k="uf" form={form} setForm={setForm} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <Field label="CEP" value={corretora.cep} />
                  <Field label="Logradouro" value={[corretora.logradouro, corretora.numero, corretora.complemento].filter(Boolean).join(', ')} />
                  <Field label="Bairro" value={corretora.bairro} />
                  <Field label="Cidade / UF" value={[corretora.cidade, corretora.uf].filter(Boolean).join(' / ')} />
                </div>
              )}
            </div>
          </div>

          {/* Responsável */}
          <div style={dk.card}>
            <SecHeader label="Responsável" icon="ti-user" secao="responsavel" />
            <div style={dk.body}>
              {editando === 'responsavel' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <Fld label="Nome" k="responsavel_nome" form={form} setForm={setForm} />
                  <Fld label="CPF" k="responsavel_cpf" form={form} setForm={setForm} />
                  <Fld label="Cargo" k="responsavel_cargo" form={form} setForm={setForm} />
                  <Fld label="E-mail" k="responsavel_email" form={form} setForm={setForm} type="email" />
                  <Fld label="Telefone" k="responsavel_telefone" form={form} setForm={setForm} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <Field label="Nome" value={corretora.responsavel_nome} />
                  <Field label="CPF" value={corretora.responsavel_cpf} />
                  <Field label="Cargo" value={corretora.responsavel_cargo} />
                  <Field label="E-mail" value={corretora.responsavel_email} />
                  <Field label="Telefone" value={corretora.responsavel_telefone} />
                </div>
              )}
            </div>
          </div>

          {/* Dados bancários */}
          <div style={dk.card}>
            <SecHeader label="Dados bancários" icon="ti-building-bank" secao="banco" />
            <div style={dk.body}>
              {editando === 'banco' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <Fld label="Banco" k="banco_nome" form={form} setForm={setForm} />
                  <div style={{ marginBottom: 12 }}>
                    <label style={dk.lbl}>Tipo de conta</label>
                    <select value={String(form.banco_tipo ?? 'corrente')} onChange={e => setForm(p => ({ ...p, banco_tipo: e.target.value }))} style={dk.inp}>
                      <option value="corrente">Conta corrente</option>
                      <option value="poupanca">Conta poupança</option>
                      <option value="pix">Somente PIX</option>
                    </select>
                  </div>
                  <Fld label="Agência" k="banco_agencia" form={form} setForm={setForm} />
                  <Fld label="Conta" k="banco_conta" form={form} setForm={setForm} />
                  <div style={{ gridColumn: '1 / -1' }}><Fld label="Chave PIX" k="banco_pix" form={form} setForm={setForm} /></div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <Field label="Banco" value={corretora.banco_nome} />
                  <Field label="Tipo" value={corretora.banco_tipo} />
                  <Field label="Agência" value={corretora.banco_agencia} />
                  <Field label="Conta" value={corretora.banco_conta} />
                  <Field label="Chave PIX" value={corretora.banco_pix} />
                </div>
              )}
            </div>
          </div>

          {/* Observações internas */}
          <div style={dk.card}>
            <SecHeader label="Observações internas" icon="ti-notes" secao="obs" />
            <div style={dk.body}>
              {editando === 'obs' ? (
                <textarea value={String(form.observacoes_internas ?? '')} onChange={e => setForm(p => ({ ...p, observacoes_internas: e.target.value }))} rows={4}
                  placeholder="Anotações internas sobre esta corretora..."
                  style={{ ...dk.inp, resize: 'vertical' }} />
              ) : (
                <p style={{ fontSize: 13, ...dk.t2, margin: 0, lineHeight: 1.6 }}>
                  {corretora.observacoes_internas ?? <span style={{ ...dk.t1, opacity: .4 }}>Sem observações.</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Coluna lateral */}
        <div>
          {/* Plano */}
          <div style={dk.card}>
            <SecHeader label="Plano e faturamento" icon="ti-crown" secao="plano" />
            <div style={dk.body}>
              {editando === 'plano' ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={dk.lbl}>Plano</label>
                    <select value={String(form.plano_id ?? '')} onChange={e => {
                      const p = planos.find(pl => pl.id === e.target.value)
                      setForm(prev => ({ ...prev, plano_id: e.target.value, plano_assinatura: p?.nome ?? '', plano_valor: p?.valor_mensal ?? null }))
                    }} style={dk.inp}>
                      <option value="">Selecione...</option>
                      {planos.map(p => <option key={p.id} value={p.id}>{p.nome_exibicao} · {p.max_cotacoes ? `${p.max_cotacoes} cotações/mês` : 'Ilimitado'}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={dk.lbl}>Status</label>
                    <select value={String(form.status_assinatura ?? 'ativa')} onChange={e => setForm(p => ({ ...p, status_assinatura: e.target.value }))} style={dk.inp}>
                      <option value="ativa">Ativa</option>
                      <option value="inadimplente">Inadimplente</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <Fld label="Valor mensal (R$)" k="plano_valor" form={form} setForm={setForm} type="number" />
                  <Fld label="Vencimento" k="plano_vencimento" form={form} setForm={setForm} type="date" />
                  <Fld label="Dia cobrança" k="dia_vencimento" form={form} setForm={setForm} type="number" />
                  <Fld label="Observações" k="plano_obs" form={form} setForm={setForm} />
                </>
              ) : (
                <>
                  <Field label="Plano" value={planos.find(p => p.nome === corretora.plano_assinatura)?.nome_exibicao ?? corretora.plano_assinatura} />
                  <Field label="Status" value={corretora.status_assinatura} />
                  <Field label="Valor mensal" value={corretora.plano_valor ? `R$ ${Number(corretora.plano_valor).toFixed(2)}` : null} />
                  <Field label="Vencimento plano" value={corretora.plano_vencimento ? new Date(corretora.plano_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : null} />
                  <Field label="Dia de cobrança" value={corretora.dia_vencimento ? `Todo dia ${corretora.dia_vencimento}` : null} />
                  <Field label="Obs." value={corretora.plano_obs} />
                </>
              )}
            </div>
          </div>

          {/* Adicionar usuário */}
          <div style={dk.card}>
            <div style={dk.hdr}>
              <i className="ti ti-user-plus" style={{ fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
              <span style={{ fontSize: 13, fontWeight: 600, ...dk.t1 }}>Adicionar usuário</span>
            </div>
            <div style={dk.body}>
              <div style={{ marginBottom: 10 }}>
                <label style={dk.lbl}>Nome *</label>
                <input value={novoNome} onChange={e => setNovoNome(e.target.value)} style={dk.inp} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={dk.lbl}>E-mail *</label>
                <input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} style={dk.inp} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={dk.lbl}>Senha *</label>
                <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} style={dk.inp} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={dk.lbl}>Papel</label>
                <select value={novoPapel} onChange={e => setNovoPapel(e.target.value)} style={dk.inp}>
                  <option value="admin">Admin</option>
                  <option value="aprovador">Aprovador</option>
                  <option value="corretor">Corretor</option>
                  <option value="visualizador">Visualizador</option>
                </select>
              </div>
              {erroUsuario && <p style={{ fontSize: 11, color: '#f85149', margin: '0 0 8px' }}>{erroUsuario}</p>}
              {okUsuario && <p style={{ fontSize: 11, color: '#3fb950', margin: '0 0 8px' }}>{okUsuario}</p>}
              <button onClick={handleCriarUsuario} disabled={criando}
                style={{ width: '100%', padding: '8px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                {criando ? 'Criando...' : 'Adicionar'}
              </button>
            </div>
          </div>

          {/* Equipe */}
          <div style={dk.card}>
            <div style={dk.hdr}>
              <i className="ti ti-users" style={{ fontSize: 14, color: '#8b949e' }} aria-hidden="true" />
              <span style={{ fontSize: 13, fontWeight: 600, ...dk.t1 }}>Equipe ({membros.length})</span>
            </div>
            {membros.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, ...dk.t2, margin: 0 }}>Nenhum membro.</p>
              </div>
            ) : membros.map(m => {
              const pc = PAPEL_COR[m.papel] ?? { bg: '#21262d', text: '#8b949e' }
              const usu = m.usuario as { nome?: string; email?: string } | null
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: '1px solid #21262d' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1a0f3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#a78bfa', flexShrink: 0 }}>
                    {usu?.nome?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, ...dk.t1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usu?.nome ?? '—'}</p>
                    <p style={{ fontSize: 10, ...dk.t2, margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usu?.email ?? '—'}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ background: pc.bg, color: pc.text, padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 500 }}>{m.papel}</span>
                    <button onClick={() => removerMembro(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#484f58', padding: 2 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f85149')} onMouseLeave={e => (e.currentTarget.style.color = '#484f58')}>
                      <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
