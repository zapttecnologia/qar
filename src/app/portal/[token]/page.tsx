'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

type Etapa = 'verificar' | 'codigo' | 'portal' | 'confirmado'

interface Cotacao {
  id: string; razao_social: string; cnpj: string; ramo: string
  contato_nome: string; contato_email: string; contato_telefone: string
  nome_fantasia: string; endereco: string; cidade_uf: string
  antt: string; importancia_segurada: number; pct_terrestre: number
  pct_aereo: number; pct_aquaviario: number; pct_ferroviario: number
  qtd_embarques_mes: number; valor_medio_embarque: number
  criado_em: string; corretora: Record<string, string>
}

export default function PortalPage() {
  const params = useParams()
  const token = params.token as string
  const [etapa, setEtapa] = useState<Etapa>('verificar')
  const [cnpj, setCnpj] = useState('')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState(['', '', '', '', '', ''])
  const [cotacao, setCotacao] = useState<Cotacao | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [emailMascarado, setEmailMascarado] = useState('')
  const [acaoFeita, setAcaoFeita] = useState<string | null>(null)
  const [mensagemAjuste, setMensagemAjuste] = useState('')
  const [mostrarAjuste, setMostrarAjuste] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  function formatarCNPJ(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 14)
    return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
  }

  async function handleVerificar() {
    if (!cnpj || !email) { setErro('Preencha o CNPJ e o e-mail.'); return }
    setCarregando(true); setErro('')
    const res = await fetch('/api/portal/verificar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, cnpj, email }),
    })
    const data = await res.json()
    if (!res.ok) { setErro(data.error); setCarregando(false); return }
    setEmailMascarado(data.email_mascarado)
    setEtapa('codigo')
    setCarregando(false)
    setTimeout(() => inputsRef.current[0]?.focus(), 100)
  }

  async function handleConfirmarCodigo() {
    const cod = codigo.join('')
    if (cod.length < 6) { setErro('Digite os 6 dígitos.'); return }
    setCarregando(true); setErro('')
    const res = await fetch('/api/portal/confirmar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, codigo: cod }),
    })
    const data = await res.json()
    if (!res.ok) { setErro(data.error); setCarregando(false); return }
    setCotacao(data.cotacao as Cotacao)
    setEtapa('portal')
    setCarregando(false)
  }

  async function handleAcao(acao: string) {
    if (acao === 'ajuste' && !mensagemAjuste.trim()) {
      setErro('Descreva o ajuste necessário.'); return
    }
    setCarregando(true); setErro('')
    const res = await fetch('/api/portal/acao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, acao, mensagem: acao === 'ajuste' ? mensagemAjuste : null }),
    })
    const data = await res.json()
    if (!res.ok) { setErro(data.error); setCarregando(false); return }
    setAcaoFeita(acao)
    setEtapa('confirmado')
    setCarregando(false)
  }

  function handleDigitoCodigo(i: number, v: string) {
    const d = v.replace(/\D/g, '').slice(-1)
    const novo = [...codigo]; novo[i] = d; setCodigo(novo)
    if (d && i < 5) inputsRef.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !codigo[i] && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
  }

  const corP = cotacao?.corretora?.cor_primaria || '#0f2744'

  const base: React.CSSProperties = { fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', minHeight: '100vh', background: '#f0f2f5' }
  const header = { background: corP, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const card: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e2e6ea', padding: '28px' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }
  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e6ea', borderRadius: 6, fontSize: 13, color: '#111827', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }
  const btn = (bg: string, color = '#fff'): React.CSSProperties => ({ width: '100%', padding: '11px', background: bg, color, border: bg === '#fff' ? '1px solid #e2e6ea' : 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 8 })

  return (
    <div style={base}>
      {/* Header */}
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: -.5 }}>QAR</span>
          <span style={{ fontSize: 20, fontWeight: 300, color: '#58a5f0', letterSpacing: -.5 }}>tech</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', letterSpacing: 2, textTransform: 'uppercase', marginLeft: 10 }}>portal</span>
        </div>
        {cotacao?.corretora?.nome_exibicao && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{cotacao.corretora.nome_exibicao}</span>
        )}
      </div>

      <div style={{ padding: '32px 16px', maxWidth: 560, margin: '0 auto' }}>

        {/* ETAPA 1 — Verificar */}
        {etapa === 'verificar' && (
          <div style={card}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, background: '#e8f2fc', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <i className="ti ti-file-certificate" style={{ fontSize: 22, color: '#1a6fbf' }} aria-hidden="true" />
              </div>
              <h1 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>Acesso ao questionário</h1>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>Confirme seus dados para acessar o QAR enviado pela corretora.</p>
            </div>
            <label style={lbl}>CNPJ da transportadora</label>
            <input value={cnpj} onChange={e => { setCnpj(formatarCNPJ(e.target.value)); setErro('') }}
              placeholder="00.000.000/0000-00" style={inp} />
            <label style={lbl}>E-mail de contato</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErro('') }}
              placeholder="seu@email.com.br" style={{ ...inp, marginBottom: 16 }} />
            {erro && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>{erro}</p>}
            <button onClick={handleVerificar} disabled={carregando} style={btn(corP)}>
              {carregando ? 'Verificando...' : <><i className="ti ti-send" style={{ fontSize: 14 }} aria-hidden="true" /> Enviar código de verificação</>}
            </button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '10px 12px', marginTop: 8 }}>
              <i className="ti ti-shield-check" style={{ fontSize: 15, color: '#1a6fbf', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <p style={{ fontSize: 12, color: '#1a6fbf', margin: 0, lineHeight: 1.5 }}>Um código de 6 dígitos será enviado para o seu e-mail. O acesso expira em 7 dias.</p>
            </div>
          </div>
        )}

        {/* ETAPA 2 — Código */}
        {etapa === 'codigo' && (
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, background: '#e8f2fc', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <i className="ti ti-mail-check" style={{ fontSize: 22, color: '#1a6fbf' }} aria-hidden="true" />
            </div>
            <h1 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>Verifique seu e-mail</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.5 }}>
              Enviamos um código para <strong style={{ color: '#111827' }}>{emailMascarado}</strong>
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              {codigo.map((d, i) => (
                <input key={i} ref={el => { inputsRef.current[i] = el }}
                  value={d} onChange={e => handleDigitoCodigo(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  maxLength={1} inputMode="numeric"
                  style={{ width: 44, height: 52, border: `2px solid ${d ? '#1a6fbf' : '#e2e6ea'}`, borderRadius: 8, fontSize: 22, fontWeight: 700, textAlign: 'center', color: '#1a6fbf', outline: 'none', background: '#fff' }} />
              ))}
            </div>
            {erro && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>{erro}</p>}
            <button onClick={handleConfirmarCodigo} disabled={carregando || codigo.join('').length < 6}
              style={{ ...btn(corP), opacity: codigo.join('').length < 6 ? .5 : 1 }}>
              {carregando ? 'Verificando...' : 'Confirmar código'}
            </button>
            <button onClick={() => { setCodigo(['','','','','','']); setEtapa('verificar') }}
              style={{ background: 'none', border: 'none', fontSize: 12, color: '#6b7280', cursor: 'pointer', marginTop: 8 }}>
              Voltar e alterar dados
            </button>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>Código válido por 10 minutos · Máximo 3 tentativas</p>
          </div>
        )}

        {/* ETAPA 3 — Portal */}
        {etapa === 'portal' && cotacao && (
          <div>
            {/* Empresa */}
            <div style={{ ...card, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>{cotacao.razao_social}</h2>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{cotacao.cnpj} · Questionário de Avaliação de Riscos</p>
                </div>
                <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 4 }}>
                  Aguardando confirmação
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                {[['Ramo', cotacao.ramo], ['Enviado por', cotacao.corretora?.nome_exibicao ?? cotacao.corretora?.nome], ['Data', new Date(cotacao.criado_em).toLocaleDateString('pt-BR')]].map(([k, v]) => (
                  <span key={k} style={{ fontSize: 11, color: '#9ca3af' }}>{k}: <strong style={{ color: '#374151' }}>{v ?? '—'}</strong></span>
                ))}
              </div>
            </div>

            {/* Dados */}
            {[
              { titulo: 'Dados cadastrais', cor: '#1a6fbf', campos: [
                ['Razão social', cotacao.razao_social], ['CNPJ', cotacao.cnpj],
                ['Nome fantasia', cotacao.nome_fantasia], ['ANTT / RNTRC', cotacao.antt],
                ['Cidade / UF', cotacao.cidade_uf], ['Contato', cotacao.contato_nome],
                ['Telefone', cotacao.contato_telefone], ['E-mail', cotacao.contato_email],
              ]},
              { titulo: 'Operação e ramos', cor: '#059669', campos: [
                ['Ramo', cotacao.ramo], ['Importância segurada', cotacao.importancia_segurada ? `R$ ${Number(cotacao.importancia_segurada).toLocaleString('pt-BR')}` : '—'],
                ['Embarques/mês', String(cotacao.qtd_embarques_mes ?? '—')], ['Valor médio/embarque', cotacao.valor_medio_embarque ? `R$ ${Number(cotacao.valor_medio_embarque).toLocaleString('pt-BR')}` : '—'],
                ['% Terrestre', cotacao.pct_terrestre ? `${cotacao.pct_terrestre}%` : '—'], ['% Aéreo', cotacao.pct_aereo ? `${cotacao.pct_aereo}%` : '—'],
              ]},
            ].map(s => (
              <div key={s.titulo} style={{ ...card, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.cor, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{s.titulo}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {s.campos.filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}>
                      <label style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 2 }}>{k}</label>
                      <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Ações */}
            <div style={card}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14 }}>O que deseja fazer?</p>
              {erro && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>{erro}</p>}
              <button onClick={() => handleAcao('confirmado')} disabled={carregando} style={btn('#059669')}>
                <i className="ti ti-circle-check" style={{ fontSize: 15 }} aria-hidden="true" />
                {carregando ? 'Processando...' : 'Confirmar dados — estão corretos'}
              </button>
              <button onClick={() => setMostrarAjuste(!mostrarAjuste)} style={btn('#fff', '#374151')}>
                <i className="ti ti-message" style={{ fontSize: 15 }} aria-hidden="true" />
                Solicitar ajuste nos dados
              </button>
              {mostrarAjuste && (
                <div style={{ marginTop: 8 }}>
                  <label style={lbl}>Descreva o que precisa ser ajustado</label>
                  <textarea value={mensagemAjuste} onChange={e => { setMensagemAjuste(e.target.value); setErro('') }} rows={3}
                    placeholder="Ex: O valor da importância segurada está incorreto, deve ser R$ 8.000.000,00"
                    style={{ ...inp, resize: 'none', marginBottom: 8 }} />
                  <button onClick={() => handleAcao('ajuste')} disabled={carregando || !mensagemAjuste.trim()}
                    style={{ ...btn('#dc2626'), opacity: !mensagemAjuste.trim() ? .5 : 1 }}>
                    <i className="ti ti-send" style={{ fontSize: 14 }} aria-hidden="true" />
                    Enviar solicitação de ajuste
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ETAPA 4 — Confirmado */}
        {etapa === 'confirmado' && (
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: acaoFeita === 'ajuste' ? '#fef3c7' : '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className={`ti ${acaoFeita === 'ajuste' ? 'ti-message' : 'ti-circle-check'}`}
                style={{ fontSize: 26, color: acaoFeita === 'ajuste' ? '#92400e' : '#059669' }} aria-hidden="true" />
            </div>
            <h1 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
              {acaoFeita === 'ajuste' ? 'Ajuste solicitado!' : 'QAR confirmado!'}
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.5 }}>
              {acaoFeita === 'ajuste'
                ? 'Sua solicitação foi enviada. A corretora entrará em contato para corrigir os dados.'
                : `Os dados foram confirmados. A corretora ${cotacao?.corretora?.nome_exibicao ?? ''} foi notificada.`}
            </p>
            {cotacao && (
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 14, textAlign: 'left', marginBottom: 16 }}>
                {[['Empresa', cotacao.razao_social], ['Ramo', cotacao.ramo], ['Data', new Date().toLocaleDateString('pt-BR')]].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: '#6b7280' }}>{k}</span>
                    <span style={{ color: '#111827', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 11, color: '#9ca3af' }}>Você pode fechar esta janela.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '20px', fontSize: 11, color: '#9ca3af' }}>
        Portal seguro QARtech · Acesso criptografado e temporário
      </div>
    </div>
  )
}
