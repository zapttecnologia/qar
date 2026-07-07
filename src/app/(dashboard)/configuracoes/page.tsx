'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSessao } from '@/hooks/useSessao'
import { createClient } from '@/lib/supabase/client'

interface CorretoraConfig {
  id: string; nome: string; nome_exibicao: string | null; cnpj: string | null
  cor_primaria: string | null; cor_secundaria: string | null; logo_url: string | null
  site_url: string | null; email_contato: string | null
  telefone_contato: string | null; endereco: string | null
  email_smtp_host?: string; email_smtp_port?: number; email_smtp_seguranca?: string
  email_smtp_usuario?: string; email_smtp_senha?: string
  email_remetente_nome?: string; email_remetente_email?: string
  assinatura_provedor?: string; assinatura_api_key?: string
  assinatura_api_secret?: string; assinatura_account_id?: string
  assinatura_cofre_uuid?: string
}

const PROVEDORES_EMAIL = [
  { label: 'Gmail', host: 'smtp.gmail.com', port: 587, seg: 'tls', cor: '#ea4335',
    instrucoes: ['Acesse myaccount.google.com → Segurança','Ative Verificação em duas etapas','Pesquise "Senhas de app" → crie uma para "Cargotech"','Copie os 16 caracteres gerados','Cole no campo Senha abaixo'],
    aviso: 'Use a Senha de App de 16 caracteres — não sua senha Google normal.',
    link: 'https://myaccount.google.com/security' },
  { label: 'Outlook / 365', host: 'smtp.office365.com', port: 587, seg: 'tls', cor: '#0078d4',
    instrucoes: ['Acesse account.microsoft.com → Segurança','Clique em "Opções de segurança avançadas"','Em Senhas de aplicativo, clique em Criar','Nome: "Cargotech" → copie a senha gerada','Cole no campo Senha abaixo'],
    aviso: 'Para Microsoft 365 Business, o admin pode precisar habilitar SMTP AUTH no Exchange Admin Center.',
    link: 'https://account.microsoft.com/security' },
  { label: 'SMTP próprio', host: '', port: 587, seg: 'tls', cor: '#6b7280',
    instrucoes: ['Obtenha as credenciais SMTP com seu provedor ou hospedagem','Preencha o Host (ex: mail.seudominio.com.br)','Porta 587 com TLS é o padrão recomendado','Use porta 465 com SSL se seu provedor exigir','O usuário geralmente é o e-mail completo'],
    aviso: 'Provedores como Locaweb, Hostgator e Kinghost fornecem SMTP via painel de controle.',
    link: null },
]

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color: 'var(--text-2)' }} aria-hidden="true" />
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{title}</h2>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { corretora, papel } = useSessao()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [salvando, setSalvando] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [provedorEmailSel, setProvedorEmailSel] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const { data: config } = useQuery({
    queryKey: ['corretora-config', corretora?.id],
    queryFn: async () => {
      const { data } = await supabase.from('corretoras').select('*').eq('id', corretora!.id).single()
      return data as unknown as CorretoraConfig
    },
    enabled: !!corretora?.id,
    onSuccess: (data: CorretoraConfig) => {
      setForm({
        nome_exibicao: data.nome_exibicao ?? data.nome ?? '',
        cnpj: data.cnpj ?? '',
        cor_primaria: data.cor_primaria ?? '#1a3a6b',
        cor_secundaria: data.cor_secundaria ?? '#e05a00',
        logo_url: data.logo_url ?? '',
        site_url: data.site_url ?? '',
        email_contato: data.email_contato ?? '',
        telefone_contato: data.telefone_contato ?? '',
        endereco: data.endereco ?? '',
        email_smtp_host: data.email_smtp_host ?? '',
        email_smtp_port: String(data.email_smtp_port ?? 587),
        email_smtp_seguranca: data.email_smtp_seguranca ?? 'tls',
        email_smtp_usuario: data.email_smtp_usuario ?? '',
        email_smtp_senha: data.email_smtp_senha ?? '',
        email_remetente_nome: data.email_remetente_nome ?? '',
        email_remetente_email: data.email_remetente_email ?? '',
        assinatura_provedor: data.assinatura_provedor ?? '',
        assinatura_api_key: data.assinatura_api_key ?? '',
        assinatura_api_secret: data.assinatura_api_secret ?? '',
        assinatura_account_id: data.assinatura_account_id ?? '',
        assinatura_cofre_uuid: data.assinatura_cofre_uuid ?? '',
      })
      if (data.email_smtp_host?.includes('gmail')) setProvedorEmailSel('Gmail')
      else if (data.email_smtp_host?.includes('office365')) setProvedorEmailSel('Outlook / 365')
      else if (data.email_smtp_host) setProvedorEmailSel('SMTP próprio')
    },
  } as Parameters<typeof useQuery>[0])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !corretora) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('corretora_id', corretora.id)
      const res = await fetch('/api/upload-logo', { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json()).error)
      const { url } = await res.json()
      const logoUrl = `${url}?t=${Date.now()}`
      setF('logo_url', logoUrl)
      await supabase.from('corretoras').update({ logo_url: logoUrl } as never).eq('id', corretora.id)
    } catch (e) { alert(`Erro no upload: ${e instanceof Error ? e.message : e}`) }
    setUploading(false)
  }

  async function handleSalvar() {
    if (!corretora) return
    setSalvando(true)
    try {
      await supabase.from('corretoras').update({
        nome_exibicao: form.nome_exibicao || null,
        cor_primaria: form.cor_primaria || null,
        cor_secundaria: form.cor_secundaria || null,
        logo_url: form.logo_url || null,
        site_url: form.site_url || null,
        email_contato: form.email_contato || null,
        telefone_contato: form.telefone_contato || null,
        endereco: form.endereco || null,
        email_smtp_host: form.email_smtp_host || null,
        email_smtp_port: Number(form.email_smtp_port) || 587,
        email_smtp_seguranca: form.email_smtp_seguranca || 'tls',
        email_smtp_usuario: form.email_smtp_usuario || null,
        email_smtp_senha: form.email_smtp_senha || null,
        email_remetente_nome: form.email_remetente_nome || null,
        email_remetente_email: form.email_remetente_email || null,
        assinatura_provedor: form.assinatura_provedor || null,
        assinatura_api_key: form.assinatura_api_key || null,
        assinatura_api_secret: form.assinatura_api_secret || null,
        assinatura_account_id: form.assinatura_account_id || null,
        assinatura_cofre_uuid: form.assinatura_cofre_uuid || null,
      } as never).eq('id', corretora.id)
      await queryClient.invalidateQueries({ queryKey: ['corretora-config', corretora.id] })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    } catch { alert('Erro ao salvar.') }
    setSalvando(false)
  }

  if (papel !== 'admin') return (
    <div style={{ padding: 20 }}>
      <div style={{ background: 'var(--status-analysis-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 14, fontSize: 13, color: 'var(--status-analysis-text)' }}>
        Apenas administradores podem acessar as configurações.
      </div>
    </div>
  )

  const corP = form.cor_primaria || '#1a3a6b'
  const corS = form.cor_secundaria || '#e05a00'
  const infoEmail = PROVEDORES_EMAIL.find(p => p.label === provedorEmailSel)

  const input = (k: string, placeholder?: string, type = 'text') => (
    <input type={type} value={form[k] ?? ''} onChange={e => setF(k, e.target.value)}
      placeholder={placeholder} className="field-input" style={{ fontSize: 13 }} />
  )

  const grid2 = (children: React.ReactNode) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>{children}</div>
  )

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')}
            style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 15 }} aria-hidden="true" />
          </button>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Configurações</h1>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>Personalização da corretora</p>
          </div>
        </div>
        <button onClick={handleSalvar} disabled={salvando} className="btn-primary">
          <i className="ti ti-device-floppy" style={{ fontSize: 14 }} aria-hidden="true" />
          {salvando ? 'Salvando...' : salvo ? '✓ Salvo!' : 'Salvar configurações'}
        </button>
      </div>

      {/* Identidade */}
      <Section title="Identidade" icon="ti-building">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Nome exibido no PDF e sistema">
            {input('nome_exibicao', 'Nome da corretora')}
          </Field>
          {grid2(<>
            <Field label="Site">{input('site_url', 'www.suacorretora.com.br')}</Field>
            <Field label="E-mail de contato">{input('email_contato', 'contato@corretora.com.br', 'email')}</Field>
            <Field label="Telefone">{input('telefone_contato', '(00) 00000-0000')}</Field>
            <Field label="Endereço">{input('endereco', 'Cidade / UF')}</Field>
          </>)}
        </div>
      </Section>

      {/* Logo */}
      <Section title="Logo" icon="ti-photo">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 96, height: 64, borderRadius: 8, border: '1px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', flexShrink: 0, overflow: 'hidden' }}>
            {form.logo_url
              ? <img src={form.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
              : <i className="ti ti-photo" style={{ fontSize: 24, color: 'var(--text-3)' }} aria-hidden="true" />}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label="URL da logo">
              <input type="url" value={form.logo_url ?? ''} onChange={e => setF('logo_url', e.target.value)}
                placeholder="https://exemplo.com/logo.png" className="field-input" style={{ fontSize: 13 }} />
            </Field>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '6px 0 10px' }}>PNG, SVG ou JPG com fundo transparente. Tamanho ideal: 300×100px.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>ou</span>
              <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={handleUpload} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
                <i className="ti ti-upload" style={{ fontSize: 13 }} aria-hidden="true" />
                {uploading ? 'Enviando...' : 'Upload direto'}
              </button>
              {form.logo_url && (
                <button onClick={() => setF('logo_url', '')} style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Remover</button>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Cores */}
      <Section title="Paleta de cores" icon="ti-palette">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
          {[['cor_primaria', 'Cor primária (cabeçalho, botões)'], ['cor_secundaria', 'Cor secundária (destaques)']].map(([k, lbl]) => (
            <Field key={k} label={lbl}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form[k] ?? '#000'} onChange={e => setF(k, e.target.value)}
                  style={{ width: 36, height: 36, borderRadius: 6, border: '1px solid var(--border-color)', padding: 2, cursor: 'pointer' }} />
                <input value={form[k] ?? ''} onChange={e => setF(k, e.target.value)}
                  placeholder="#000000" maxLength={7} className="field-input" style={{ fontFamily: 'monospace', fontSize: 13 }} />
              </div>
            </Field>
          ))}
        </div>
        {/* Preview */}
        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <div style={{ background: corP, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {form.logo_url
                ? <img src={form.logo_url} alt="Logo" style={{ height: 28, objectFit: 'contain', maxWidth: 120 }} />
                : <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{form.nome_exibicao || (config as CorretoraConfig)?.nome || 'Sua Corretora'}</span>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,.8)', fontSize: 11 }}>Questionário de Avaliação de Riscos — QAR</div>
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 10 }}>{form.site_url || 'www.suacorretora.com.br'}</div>
            </div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: corS }} />
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Dados Cadastrais</span>
          </div>
          <div style={{ background: 'var(--bg-page)', padding: '6px 16px' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Razão Social: _________________________ · CNPJ: __.___.___/____-__</span>
          </div>
        </div>
      </Section>

      {/* E-mail SMTP */}
      <Section title="E-mail de envio" icon="ti-mail">
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>Usado quando o corretor não tem e-mail configurado no perfil.</p>
        {/* Seletor de provedor */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {PROVEDORES_EMAIL.map(p => (
            <button key={p.label} onClick={() => { setProvedorEmailSel(p.label); if (p.host) { setF('email_smtp_host', p.host); setF('email_smtp_port', String(p.port)); setF('email_smtp_seguranca', p.seg) } }}
              style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${provedorEmailSel === p.label ? p.cor : 'var(--border-color)'}`, background: provedorEmailSel === p.label ? `${p.cor}12` : 'var(--bg-card)', color: provedorEmailSel === p.label ? p.cor : 'var(--text-2)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              {p.label}
            </button>
          ))}
        </div>
        {/* Instruções do provedor selecionado */}
        {infoEmail && (
          <div style={{ background: `${infoEmail.cor}10`, border: `1px solid ${infoEmail.cor}30`, borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: infoEmail.cor, marginBottom: 8 }}>Como configurar — {infoEmail.label}</p>
            <ol style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {infoEmail.instrucoes.map((t, i) => <li key={i} style={{ fontSize: 12, color: 'var(--text-2)' }}>{t}</li>)}
            </ol>
            <p style={{ fontSize: 11, color: infoEmail.cor, fontWeight: 500, marginTop: 8 }}>{infoEmail.aviso}</p>
            {infoEmail.link && <a href={infoEmail.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: infoEmail.cor, display: 'inline-block', marginTop: 6 }}>Abrir configurações →</a>}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Servidor SMTP (host)">{input('email_smtp_host', 'smtp.gmail.com')}</Field>
          {grid2(<>
            <Field label="Porta">
              <input type="number" value={form.email_smtp_port ?? '587'} onChange={e => setF('email_smtp_port', e.target.value)} className="field-input" style={{ fontSize: 13 }} />
            </Field>
            <Field label="Segurança">
              <select value={form.email_smtp_seguranca ?? 'tls'} onChange={e => setF('email_smtp_seguranca', e.target.value)} className="field-input" style={{ fontSize: 13 }}>
                <option value="tls">TLS — porta 587 (recomendado)</option>
                <option value="ssl">SSL — porta 465</option>
                <option value="none">Nenhuma — porta 25</option>
              </select>
            </Field>
            <Field label="Usuário / E-mail SMTP">{input('email_smtp_usuario', 'envios@corretora.com.br', 'email')}</Field>
            <Field label="Senha / App Password">{input('email_smtp_senha', '••••••••••••', 'password')}</Field>
            <Field label="Nome do remetente">{input('email_remetente_nome', 'V.Tech Seguros')}</Field>
            <Field label="E-mail do remetente">{input('email_remetente_email', 'cotacoes@vtechseguros.com.br', 'email')}</Field>
          </>)}
        </div>
      </Section>

      {/* Assinatura eletrônica */}
      <Section title="Assinatura eletrônica" icon="ti-signature">
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>Configure o provedor para envio de documentos para assinatura digital.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {[{ v: 'clicksign', l: 'ClickSign' }, { v: 'd4sign', l: 'D4Sign' }, { v: 'docusign', l: 'DocuSign' }].map(p => (
            <button key={p.v} onClick={() => setF('assinatura_provedor', p.v)}
              style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${form.assinatura_provedor === p.v ? '#7c3aed' : 'var(--border-color)'}`, background: form.assinatura_provedor === p.v ? '#7c3aed12' : 'var(--bg-card)', color: form.assinatura_provedor === p.v ? '#7c3aed' : 'var(--text-2)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              ✍️ {p.l}
            </button>
          ))}
        </div>
        {form.assinatura_provedor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label={`API Key ${form.assinatura_provedor === 'clicksign' ? '(Access Token)' : '(Token API)'}`}>
              {input('assinatura_api_key', 'Cole sua API Key', 'password')}
            </Field>
            {form.assinatura_provedor === 'd4sign' && grid2(<>
              <Field label="Crypt Key">{input('assinatura_api_secret', 'Crypt Key do D4Sign', 'password')}</Field>
              <Field label="UUID do Cofre">{input('assinatura_cofre_uuid', 'UUID do cofre no D4Sign')}</Field>
            </>)}
            {form.assinatura_provedor === 'docusign' && (
              <Field label="Account ID">{input('assinatura_account_id', 'Account ID do DocuSign')}</Field>
            )}
          </div>
        )}
      </Section>
    </div>
  )
}
