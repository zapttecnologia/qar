'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, Save, Palette, Building2 } from 'lucide-react'
import { useSessao } from '@/hooks/useSessao'
import { createClient } from '@/lib/supabase/client'

interface CorretoraConfig {
  id: string
  nome: string
  nome_exibicao: string | null
  cnpj: string | null
  cor_primaria: string | null
  cor_secundaria: string | null
  logo_url: string | null
  site_url: string | null
  email_contato: string | null
  telefone_contato: string | null
  endereco: string | null
}

export default function ConfiguracoesPage() {
  const { corretora, papel } = useSessao()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [salvando, setSalvando] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [form, setForm] = useState<Partial<CorretoraConfig>>({})
  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const { data: config, isLoading } = useQuery({
    queryKey: ['corretora-config', corretora?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('corretoras')
        .select('*')
        .eq('id', corretora!.id)
        .single()
      return data as unknown as CorretoraConfig
    },
    enabled: !!corretora?.id,
    onSuccess: (data: CorretoraConfig) => {
      setForm({
        nome: data.nome,
        nome_exibicao: data.nome_exibicao ?? data.nome,
        cnpj: data.cnpj ?? '',
        cor_primaria: data.cor_primaria ?? '#1a3a6b',
        cor_secundaria: data.cor_secundaria ?? '#e05a00',
        logo_url: data.logo_url ?? '',
        site_url: data.site_url ?? '',
        email_contato: data.email_contato ?? '',
        telefone_contato: data.telefone_contato ?? '',
        endereco: data.endereco ?? '',
      })
    },
  } as Parameters<typeof useQuery>[0])

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !corretora) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('corretora_id', corretora.id)

      const res = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao fazer upload')
      }

      const { url } = await res.json()
      const logoUrl = `${url}?t=${Date.now()}`
      setF('logo_url', logoUrl)

      // Salva imediatamente no banco sem precisar clicar em Salvar
      await supabase
        .from('corretoras')
        .update({ logo_url: logoUrl } as never)
        .eq('id', corretora.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      alert(`Erro ao fazer upload: ${msg}`)
    }
    setUploading(false)
  }

  async function handleSalvar() {
    if (!corretora) return
    setSalvando(true)
    try {
      const { error } = await supabase
        .from('corretoras')
        .update({
          nome_exibicao: form.nome_exibicao,
          cor_primaria: form.cor_primaria,
          cor_secundaria: form.cor_secundaria,
          logo_url: form.logo_url,
          site_url: form.site_url,
          email_contato: form.email_contato,
          telefone_contato: form.telefone_contato,
          endereco: form.endereco,
          email_smtp_host: (form as Record<string,string>).email_smtp_host ?? null,
          email_smtp_port: Number((form as Record<string,string>).email_smtp_port) || 587,
          email_smtp_seguranca: (form as Record<string,string>).email_smtp_seguranca ?? 'tls',
          email_smtp_usuario: (form as Record<string,string>).email_smtp_usuario ?? null,
          email_smtp_senha: (form as Record<string,string>).email_smtp_senha ?? null,
          email_remetente_nome: (form as Record<string,string>).email_remetente_nome ?? null,
          email_remetente_email: (form as Record<string,string>).email_remetente_email ?? null,
          assinatura_provedor: (form as Record<string,string>).assinatura_provedor ?? null,
          assinatura_api_key: (form as Record<string,string>).assinatura_api_key ?? null,
          assinatura_api_secret: (form as Record<string,string>).assinatura_api_secret ?? null,
          assinatura_account_id: (form as Record<string,string>).assinatura_account_id ?? null,
          assinatura_cofre_uuid: (form as Record<string,string>).assinatura_cofre_uuid ?? null,
        } as never)
        .eq('id', corretora.id)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['corretora-config', corretora.id] })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    } catch {
      alert('Erro ao salvar configurações.')
    }
    setSalvando(false)
  }

  if (papel !== 'admin') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400">
          Apenas administradores podem acessar as configurações da corretora.
        </div>
      </div>
    )
  }

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Carregando...</div>

  const corPrimaria = form.cor_primaria ?? '#1a3a6b'
  const corSecundaria = form.cor_secundaria ?? '#e05a00'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Configurações</h1>
          <p className="text-sm text-gray-500 mt-0.5">Personalização da corretora</p>
        </div>
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
          style={{ backgroundColor: corPrimaria }}
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando...' : salvo ? '✓ Salvo!' : 'Salvar configurações'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Identidade */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Identidade</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome exibido no PDF e sistema</label>
              <input
                value={form.nome_exibicao ?? ''}
                onChange={e => setF('nome_exibicao', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Site</label>
                <input value={form.site_url ?? ''} onChange={e => setF('site_url', e.target.value)}
                  placeholder="www.suacorretora.com.br"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">E-mail de contato</label>
                <input value={form.email_contato ?? ''} onChange={e => setF('email_contato', e.target.value)}
                  type="email" placeholder="contato@corretora.com.br"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                <input value={form.telefone_contato ?? ''} onChange={e => setF('telefone_contato', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Endereço</label>
                <input value={form.endereco ?? ''} onChange={e => setF('endereco', e.target.value)}
                  placeholder="Cidade / UF"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Logo</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Preview da logo */}
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-xs text-gray-400 text-center px-2">Sem logo</span>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">URL da logo (cole o link da imagem)</label>
                <input
                  value={form.logo_url ?? ''}
                  onChange={e => setF('logo_url', e.target.value)}
                  placeholder="https://exemplo.com/logo.png"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">PNG, SVG ou JPG com fundo transparente. Você pode usar Google Drive, Dropbox ou qualquer hospedagem de imagens.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">ou</span>
                <div>
                  <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={handleUploadLogo} className="hidden" />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? 'Enviando...' : 'Upload direto'}
                  </button>
                </div>
                {form.logo_url && (
                  <button onClick={() => setF('logo_url', '')} className="text-xs text-red-500 hover:underline">
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cores */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Paleta de cores</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2">Cor primária (cabeçalho, botões)</label>
              <div className="flex items-center gap-3">
                <input type="color" value={corPrimaria} onChange={e => setF('cor_primaria', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
                <input value={corPrimaria} onChange={e => setF('cor_primaria', e.target.value)}
                  placeholder="#1a3a6b" maxLength={7}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">Cor secundária (destaques, links)</label>
              <div className="flex items-center gap-3">
                <input type="color" value={corSecundaria} onChange={e => setF('cor_secundaria', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
                <input value={corSecundaria} onChange={e => setF('cor_secundaria', e.target.value)}
                  placeholder="#e05a00" maxLength={7}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Preview do cabeçalho do PDF */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Preview — como vai aparecer no PDF:</p>
            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: corPrimaria }}>
                <div className="flex items-center gap-3">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo" className="h-8 object-contain" style={{ maxWidth: 120 }} />
                  ) : (
                    <span className="text-white font-bold text-sm">{form.nome_exibicao ?? (config as unknown as CorretoraConfig)?.nome ?? 'Sua Corretora'}</span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-white opacity-80">Questionário de Avaliação de Riscos</p>
                  <p className="text-xs text-white opacity-60">{form.site_url || 'www.suacorretora.com.br'}</p>
                </div>
              </div>
              <div className="bg-white px-5 py-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: corSecundaria }} />
                <span className="text-xs text-gray-500">Dados Cadastrais</span>
              </div>
              <div className="bg-gray-50 px-5 py-1.5">
                <span className="text-xs text-gray-400">Razão Social: _________________________ CNPJ: ______._____._____/____-__</span>
              </div>
            </div>
          </div>
        </div>
        {/* E-mail SMTP */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">E-mail de envio (corretora)</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">Usado como fallback quando o corretor não tem e-mail configurado no perfil.</p>

          {/* Seletor de provedor com instruções dinâmicas */}
          {(() => {
            const provedores = [
              {
                label: 'Gmail',
                host: 'smtp.gmail.com',
                port: 587,
                seg: 'tls',
                cor: 'text-red-600 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
                icone: '📧',
                instrucoes: [
                  { passo: '1', texto: 'Acesse myaccount.google.com → Segurança' },
                  { passo: '2', texto: 'Ative a Verificação em duas etapas (obrigatório)' },
                  { passo: '3', texto: 'Pesquise "Senhas de app" na barra de busca da conta' },
                  { passo: '4', texto: 'Crie uma senha com nome "Cargotech" → copie os 16 caracteres' },
                  { passo: '5', texto: 'Cole essa senha no campo "Senha / App Password" abaixo' },
                ],
                aviso: '⚠️ Use a Senha de App de 16 caracteres — não a senha da sua conta Google.',
                link: { texto: 'Abrir configurações do Google', url: 'https://myaccount.google.com/security' },
              },
              {
                label: 'Outlook / 365',
                host: 'smtp.office365.com',
                port: 587,
                seg: 'tls',
                cor: 'text-blue-600 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30',
                icone: '📨',
                instrucoes: [
                  { passo: '1', texto: 'Acesse account.microsoft.com → Segurança' },
                  { passo: '2', texto: 'Clique em "Opções de segurança avançadas"' },
                  { passo: '3', texto: 'Em "Senhas de aplicativo", clique em Criar' },
                  { passo: '4', texto: 'Dê o nome "Cargotech" e copie a senha gerada' },
                  { passo: '5', texto: 'Cole no campo "Senha / App Password" abaixo' },
                ],
                aviso: '⚠️ Para Microsoft 365 Business, o admin pode precisar habilitar SMTP AUTH no Exchange Admin Center.',
                link: { texto: 'Abrir conta Microsoft', url: 'https://account.microsoft.com/security' },
              },
              {
                label: 'SMTP próprio',
                host: '',
                port: 587,
                seg: 'tls',
                cor: 'text-gray-600 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800',
                icone: '🔧',
                instrucoes: [
                  { passo: '1', texto: 'Obtenha as credenciais SMTP com seu provedor de e-mail ou hospedagem' },
                  { passo: '2', texto: 'Preencha o Host (ex: mail.seudominio.com.br)' },
                  { passo: '3', texto: 'Porta 587 com TLS é o padrão mais seguro e recomendado' },
                  { passo: '4', texto: 'Use porta 465 com SSL se seu provedor exigir' },
                  { passo: '5', texto: 'O usuário é geralmente o e-mail completo (ex: envios@seudominio.com.br)' },
                ],
                aviso: '💡 Provedores como Locaweb, Hostgator, Kinghost e UOL Host fornecem SMTP. Consulte o painel de controle da sua hospedagem.',
                link: null,
              },
            ]

            const hostAtual = (form as Record<string, string>).email_smtp_host ?? ''
            const provedorAtivo = hostAtual.includes('gmail') ? 'Gmail'
              : hostAtual.includes('office365') || hostAtual.includes('microsoft') ? 'Outlook / 365'
              : hostAtual ? 'SMTP próprio'
              : null

            const [provedorSel, setProvedorSel] = [
              provedorAtivo,
              (label: string) => {
                const p = provedores.find(x => x.label === label)!
                setF('email_smtp_host', p.host)
                setF('email_smtp_port', String(p.port))
                setF('email_smtp_seguranca', p.seg)
              }
            ]

            const infoAtiva = provedores.find(p => p.label === provedorSel)

            return (
              <>
                <div className="flex gap-2 flex-wrap mb-4">
                  {provedores.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setProvedorSel(p.label)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
                        ${provedorSel === p.label
                          ? p.cor
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      <span>{p.icone}</span> {p.label}
                    </button>
                  ))}
                </div>

                {infoAtiva && (
                  <div className={`rounded-lg border p-4 mb-4 ${infoAtiva.cor}`}>
                    <p className="text-xs font-semibold mb-2">Como configurar — {infoAtiva.label}</p>
                    <ol className="space-y-1.5 mb-3">
                      {infoAtiva.instrucoes.map(i => (
                        <li key={i.passo} className="flex gap-2 text-xs">
                          <span className="w-4 h-4 rounded-full bg-current opacity-20 flex items-center justify-center flex-shrink-0 font-bold">{i.passo}</span>
                          <span className="opacity-80">{i.texto}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="text-xs opacity-70 font-medium">{infoAtiva.aviso}</p>
                    {infoAtiva.link && (
                      <a href={infoAtiva.link.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs mt-2 underline opacity-70 hover:opacity-100">
                        {infoAtiva.link.texto} →
                      </a>
                    )}
                  </div>
                )}
              </>
            )
          })()}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Servidor SMTP (host)</label>
              <input value={(form as Record<string,string>).email_smtp_host ?? ''} onChange={e => setF('email_smtp_host', e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Porta</label>
              <input value={(form as Record<string,string>).email_smtp_port ?? '587'} onChange={e => setF('email_smtp_port', e.target.value)}
                type="number" placeholder="587"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Segurança</label>
              <select value={(form as Record<string,string>).email_smtp_seguranca ?? 'tls'} onChange={e => setF('email_smtp_seguranca', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="tls">TLS — porta 587 (recomendado)</option>
                <option value="ssl">SSL — porta 465</option>
                <option value="none">Nenhuma — porta 25 (não recomendado)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Usuário / E-mail SMTP</label>
              <input value={(form as Record<string,string>).email_smtp_usuario ?? ''} onChange={e => setF('email_smtp_usuario', e.target.value)}
                type="email" placeholder="envios@corretora.com.br"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Senha / App Password</label>
              <input value={(form as Record<string,string>).email_smtp_senha ?? ''} onChange={e => setF('email_smtp_senha', e.target.value)}
                type="password" placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome do remetente</label>
              <input value={(form as Record<string,string>).email_remetente_nome ?? ''} onChange={e => setF('email_remetente_nome', e.target.value)}
                placeholder="V.Tech Seguros"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">E-mail do remetente (exibido)</label>
              <input value={(form as Record<string,string>).email_remetente_email ?? ''} onChange={e => setF('email_remetente_email', e.target.value)}
                type="email" placeholder="cotacoes@vtechseguros.com.br"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        {/* Assinatura Eletrônica */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Assinatura Eletrônica</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">Configure o provedor para envio de documentos para assinatura digital.</p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Provedor</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'clicksign', label: 'ClickSign', url: 'https://clicksign.com' },
                  { value: 'd4sign', label: 'D4Sign', url: 'https://d4sign.com.br' },
                  { value: 'docusign', label: 'DocuSign', url: 'https://docusign.com' },
                ].map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setF('assinatura_provedor', p.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
                      ${(form as Record<string,string>).assinatura_provedor === p.value
                        ? 'border-purple-400 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    ✍️ {p.label}
                  </button>
                ))}
              </div>
            </div>

            {(form as Record<string,string>).assinatura_provedor && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">
                    API Key {(form as Record<string,string>).assinatura_provedor === 'clicksign' ? '(Access Token)' : '(Token API)'}
                  </label>
                  <input
                    value={(form as Record<string,string>).assinatura_api_key ?? ''}
                    onChange={e => setF('assinatura_api_key', e.target.value)}
                    type="password"
                    placeholder="Cole sua API Key aqui"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {(form as Record<string,string>).assinatura_provedor === 'd4sign' && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Crypt Key (API Secret)</label>
                      <input value={(form as Record<string,string>).assinatura_api_secret ?? ''} onChange={e => setF('assinatura_api_secret', e.target.value)}
                        type="password" placeholder="Crypt Key do D4Sign"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">UUID do Cofre</label>
                      <input value={(form as Record<string,string>).assinatura_cofre_uuid ?? ''} onChange={e => setF('assinatura_cofre_uuid', e.target.value)}
                        placeholder="UUID do cofre no D4Sign"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                  </>
                )}

                {(form as Record<string,string>).assinatura_provedor === 'docusign' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Account ID</label>
                    <input value={(form as Record<string,string>).assinatura_account_id ?? ''} onChange={e => setF('assinatura_account_id', e.target.value)}
                      placeholder="Account ID do DocuSign"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                )}

                {/* Instruções por provedor */}
                <div className="col-span-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                  {(form as Record<string,string>).assinatura_provedor === 'clicksign' && (
                    <p className="text-xs text-purple-700 dark:text-purple-400">
                      <strong>ClickSign:</strong> Acesse app.clicksign.com → Configurações → Integrações → Access Token. Use o ambiente Sandbox para testes.
                    </p>
                  )}
                  {(form as Record<string,string>).assinatura_provedor === 'd4sign' && (
                    <p className="text-xs text-purple-700 dark:text-purple-400">
                      <strong>D4Sign:</strong> Acesse app.d4sign.com.br → Configurações → Integrações API. O UUID do cofre está em Meus Documentos → selecione o cofre.
                    </p>
                  )}
                  {(form as Record<string,string>).assinatura_provedor === 'docusign' && (
                    <p className="text-xs text-purple-700 dark:text-purple-400">
                      <strong>DocuSign:</strong> Acesse admin.docusign.com → Integrações → Apps and Keys. Use o ambiente Demo (developer.docusign.com) para testes.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
