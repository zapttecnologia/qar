'use client'

// Componente de PDF do QAR usando @react-pdf/renderer
// Renderiza o Questionário de Avaliação de Riscos com a identidade visual da corretora

import {
  Document, Page, View, Text, Image, StyleSheet, Font
} from '@react-pdf/renderer'

// Tipos
interface Corretora {
  nome_exibicao?: string | null
  nome: string
  logo_url?: string | null
  cor_primaria?: string | null
  cor_secundaria?: string | null
  site_url?: string | null
}

interface CotacaoQAR {
  // Cadastro
  cnpj: string
  razao_social?: string | null
  nome_fantasia?: string | null
  atividade_principal?: string | null
  endereco?: string | null
  cep?: string | null
  cidade_uf?: string | null
  site?: string | null
  antt?: string | null
  contato_nome?: string | null
  contato_email?: string | null
  contato_telefone?: string | null
  // Ramos
  ramos?: string[]
  embarcador_tn?: boolean
  embarcador_exportacao?: boolean
  embarcador_importacao?: boolean
  // Averbação
  averb_atm?: boolean
  averb_averbnet?: boolean
  averb_ndd?: boolean
  averb_citnet?: boolean
  averb_outro?: string | null
  averb_contato_nome?: string | null
  averb_contato_email?: string | null
  averb_contato_telefone?: string | null
  averb_email_fatura?: string | null
  // Transporte
  pct_terrestre?: number
  pct_aereo?: number
  pct_aquaviario?: number
  pct_ferroviario?: number
  // Operação
  qtd_embarques_mes?: number | null
  valor_medio_embarque?: number | null
  valor_maximo_embarque?: number | null
  importancia_segurada?: number | null
  obs_sazonalidade?: string | null
  detalhes_operacao?: string | null
  // Motoristas
  pct_frota?: number
  pct_transportadoras?: number
  pct_agregado?: number
  pct_autonomo?: number
  // Sinistros
  sinistros_periodo?: string | null
  sinistros_detalhes?: string | null
  // Condições
  condicoes_particulares?: string | null
  gerenc_rastreador_fornecedor?: string | null
  gerenc_rastreador_tipo?: string | null
  gerenc_detalhes?: string | null
  // Assinatura
  assinatura_local?: string | null
  assinatura_data?: string | null
}

interface Props {
  corretora: Corretora
  cotacao: CotacaoQAR
  mercadorias?: Array<{ tipo: string; embarcador?: string; percentual?: number }>
  percursos?: Array<{ origem: string; destino: string; percentual?: number }>
  expAnterior?: Array<{ seguradora?: string; corretor?: string; ramo?: string; vigencia?: string; premio_pago?: number }>
  condicaoAtual?: Array<{ lmg?: string; ramo?: string; taxa?: string; pos?: string; premio_minimo?: number }>
  sinistros?: Array<{ data_sinistro?: string; ramo?: string; local_origem?: string; local_destino?: string; valor_prejuizo?: number }>
  ddrs?: Array<{ embarcador?: string; seguradora?: string; lmg?: string; vigencia?: string }>
  gerenciadoras?: Array<{ gerenciadora: string; possui_cadastro?: boolean; possui_vitimologia?: boolean; possui_monitoramento?: boolean }>
  condPretendidas?: Array<{ lmg?: string; ramo?: string; taxa?: string; pos_franquia?: string; premio_minimo?: number }>
}

const BRL = (v?: number | null) =>
  v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'

const sim = (v?: boolean) => v ? 'Sim' : 'Não'
const pct = (v?: number) => v ? `${v}%` : '—'

export function QarPDF({
  corretora, cotacao, mercadorias = [], percursos = [],
  expAnterior = [], condicaoAtual = [], sinistros = [],
  ddrs = [], gerenciadoras = [], condPretendidas = []
}: Props) {
  const corP = corretora.cor_primaria ?? '#1a3a6b'
  const corS = corretora.cor_secundaria ?? '#e05a00'
  const nomeCorretora = corretora.nome_exibicao ?? corretora.nome

  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 9, color: '#222', paddingHorizontal: 32, paddingVertical: 28 },
    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: corP },
    headerLogo: { width: 100, height: 36, objectFit: 'contain' },
    headerNome: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: corP },
    headerSub: { fontSize: 8, color: '#666', textAlign: 'right' },
    headerSite: { fontSize: 7, color: corS, textAlign: 'right', marginTop: 2 },
    // Seção
    sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: corP, borderBottomWidth: 1, borderBottomColor: corP, paddingBottom: 2, marginTop: 10, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
    // Campos
    row: { flexDirection: 'row', marginBottom: 3 },
    label: { fontSize: 8, color: '#666', width: 110 },
    value: { fontSize: 8, color: '#111', flex: 1 },
    // Tabela
    table: { marginTop: 4, marginBottom: 4 },
    tableHeader: { flexDirection: 'row', backgroundColor: corP, paddingVertical: 3, paddingHorizontal: 5 },
    tableHeaderCell: { fontSize: 7, color: '#fff', fontFamily: 'Helvetica-Bold', flex: 1 },
    tableRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: '#e5e5e5' },
    tableCell: { fontSize: 8, color: '#111', flex: 1 },
    tableRowAlt: { backgroundColor: '#f9f9f9' },
    // Checkboxes em linha
    checkRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 4 },
    checkItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    checkBox: { width: 8, height: 8, borderWidth: 1, borderColor: '#999', borderRadius: 1 },
    checkBoxChecked: { width: 8, height: 8, borderWidth: 1, borderColor: corP, backgroundColor: corP, borderRadius: 1 },
    checkLabel: { fontSize: 8, color: '#333' },
    // Grid 2 colunas
    grid2: { flexDirection: 'row', gap: 16 },
    col: { flex: 1 },
    // Footer
    footer: { position: 'absolute', bottom: 16, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: '#ddd', paddingTop: 5 },
    footerText: { fontSize: 7, color: '#aaa' },
    // Assinatura
    assinaturaBox: { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 4, marginTop: 16, flex: 1, alignItems: 'center' },
    assinaturaLabel: { fontSize: 8, color: '#666', textAlign: 'center' },
    // Declaração
    declaracao: { fontSize: 7.5, color: '#444', lineHeight: 1.5, marginTop: 6, textAlign: 'justify' },
  })

  const Campo = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <View style={styles.row}>
        <Text style={styles.label}>{label}:</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    ) : null

  const Secao = ({ titulo }: { titulo: string }) => (
    <Text style={styles.sectionTitle}>{titulo}</Text>
  )

  const Check = ({ checked, label }: { checked?: boolean; label: string }) => (
    <View style={styles.checkItem}>
      <View style={checked ? styles.checkBoxChecked : styles.checkBox} />
      <Text style={styles.checkLabel}>{label}</Text>
    </View>
  )

  const ramos = cotacao.ramos ?? []
  const sinPeriodo = cotacao.sinistros_periodo

  return (
    <Document>
      {/* ── PÁGINA 1 ── */}
      <Page size="A4" style={styles.page}>

        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            {corretora.logo_url ? (
              <Image src={corretora.logo_url} style={styles.headerLogo} />
            ) : (
              <Text style={styles.headerNome}>{nomeCorretora}</Text>
            )}
          </View>
          <View>
            <Text style={styles.headerSub}>Questionário de Avaliação de Riscos — QAR</Text>
            <Text style={styles.headerSub}>Seguro de Transportes de Carga</Text>
            {corretora.site_url && <Text style={styles.headerSite}>{corretora.site_url}</Text>}
          </View>
        </View>

        {/* Dados Cadastrais */}
        <Secao titulo="Dados Cadastrais" />
        <View style={styles.grid2}>
          <View style={styles.col}>
            <Campo label="Nome Fantasia" value={cotacao.nome_fantasia} />
            <Campo label="Razão Social" value={cotacao.razao_social} />
            <Campo label="Ativ. Principal" value={cotacao.atividade_principal} />
            <Campo label="Endereço" value={cotacao.endereco} />
            <Campo label="Cidade / UF" value={cotacao.cidade_uf} />
            <Campo label="E-mail" value={cotacao.contato_email} />
          </View>
          <View style={styles.col}>
            <Campo label="CNPJ" value={cotacao.cnpj} />
            <Campo label="Site" value={cotacao.site} />
            <Campo label="ANTT / RNTRC" value={cotacao.antt} />
            <Campo label="CEP" value={cotacao.cep} />
            <Campo label="Contato" value={cotacao.contato_nome} />
            <Campo label="Telefone" value={cotacao.contato_telefone} />
          </View>
        </View>

        {/* Ramos */}
        <Secao titulo="Ramos" />
        <Text style={{ fontSize: 8, color: '#666', marginBottom: 3 }}>Transportadores:</Text>
        <View style={styles.checkRow}>
          {['RCTR-C','RC-DC','RCTA-C','RCT-OM','RCTR-VI','RCA-C'].map(r => (
            <Check key={r} checked={ramos.includes(r)} label={r} />
          ))}
        </View>
        <Text style={{ fontSize: 8, color: '#666', marginBottom: 3, marginTop: 4 }}>Embarcador:</Text>
        <View style={styles.checkRow}>
          <Check checked={cotacao.embarcador_tn} label="TN" />
          <Check checked={cotacao.embarcador_exportacao} label="Exportação" />
          <Check checked={cotacao.embarcador_importacao} label="Importação" />
        </View>

        {/* Dados da Averbação */}
        <Secao titulo="Dados da Averbação" />
        <View style={styles.checkRow}>
          <Check checked={cotacao.averb_atm} label="AT&M" />
          <Check checked={cotacao.averb_averbnet} label="Averbnet" />
          <Check checked={cotacao.averb_ndd} label="NDD" />
          <Check checked={cotacao.averb_citnet} label="Citnet" />
          {cotacao.averb_outro && <Check checked label={`Outro: ${cotacao.averb_outro}`} />}
        </View>
        <Campo label="Contato averbação" value={cotacao.averb_contato_nome} />
        <Campo label="E-mail averbação" value={cotacao.averb_contato_email} />
        <Campo label="E-mail fatura" value={cotacao.averb_email_fatura} />

        {/* Tipos de Transporte */}
        <Secao titulo="Tipos de Transporte" />
        <View style={styles.checkRow}>
          <Check checked={(cotacao.pct_terrestre ?? 0) > 0} label={`Terrestre ${pct(cotacao.pct_terrestre)}`} />
          <Check checked={(cotacao.pct_aereo ?? 0) > 0} label={`Aéreo ${pct(cotacao.pct_aereo)}`} />
          <Check checked={(cotacao.pct_aquaviario ?? 0) > 0} label={`Aquaviário ${pct(cotacao.pct_aquaviario)}`} />
          <Check checked={(cotacao.pct_ferroviario ?? 0) > 0} label={`Ferroviário ${pct(cotacao.pct_ferroviario)}`} />
        </View>

        {/* Mercadorias */}
        {mercadorias.length > 0 && (
          <>
            <Secao titulo="Mercadorias" />
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Tipo</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Embarcador</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>%</Text>
              </View>
              {mercadorias.map((m, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={[styles.tableCell, { flex: 3 }]}>{m.tipo}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{m.embarcador ?? '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{m.percentual ? `${m.percentual}%` : '—'}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Percursos + Operação lado a lado */}
        <View style={[styles.grid2, { marginTop: 6 }]}>
          <View style={styles.col}>
            <Secao titulo="Percursos" />
            {percursos.length > 0 && (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Origem</Text>
                  <Text style={styles.tableHeaderCell}>Destino</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.6 }]}>%</Text>
                </View>
                {percursos.map((p, i) => (
                  <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Text style={styles.tableCell}>{p.origem}</Text>
                    <Text style={styles.tableCell}>{p.destino}</Text>
                    <Text style={[styles.tableCell, { flex: 0.6 }]}>{p.percentual ? `${p.percentual}%` : '—'}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={styles.col}>
            <Secao titulo="Operação / mês" />
            <Campo label="Qtd. embarques" value={cotacao.qtd_embarques_mes?.toString()} />
            <Campo label="Vlr médio embarque" value={BRL(cotacao.valor_medio_embarque)} />
            <Campo label="Vlr máximo embarque" value={BRL(cotacao.valor_maximo_embarque)} />
            <Campo label="Import. segurada total" value={BRL(cotacao.importancia_segurada)} />
            {cotacao.obs_sazonalidade && <Campo label="Sazonalidade" value={cotacao.obs_sazonalidade} />}
          </View>
        </View>

        {/* Footer pág 1 */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{nomeCorretora} — QAR Seguro de Transportes de Carga</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* ── PÁGINA 2 ── */}
      <Page size="A4" style={styles.page}>

        {/* Mini header */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: corP, marginBottom: 8, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: corP }}>{nomeCorretora}</Text>
          <Text style={{ fontSize: 8, color: '#888' }}>QAR — Seguro de Transportes de Carga</Text>
        </View>

        {/* Detalhes da Operação */}
        {cotacao.detalhes_operacao && (
          <>
            <Secao titulo="Detalhes da Operação" />
            <Text style={{ fontSize: 8, color: '#333', lineHeight: 1.4 }}>{cotacao.detalhes_operacao}</Text>
          </>
        )}

        {/* Motoristas */}
        <Secao titulo="Motoristas" />
        <View style={styles.checkRow}>
          <Check checked={(cotacao.pct_frota ?? 0) > 0} label={`Frota ${pct(cotacao.pct_frota)}`} />
          <Check checked={(cotacao.pct_transportadoras ?? 0) > 0} label={`Sub-contratadas ${pct(cotacao.pct_transportadoras)}`} />
          <Check checked={(cotacao.pct_agregado ?? 0) > 0} label={`Agregado ${pct(cotacao.pct_agregado)}`} />
          <Check checked={(cotacao.pct_autonomo ?? 0) > 0} label={`Autônomo ${pct(cotacao.pct_autonomo)}`} />
        </View>

        {/* Experiência Anterior */}
        {expAnterior.length > 0 && (
          <>
            <Secao titulo="Experiência Anterior" />
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {['Seguradora','Corretor','Ramo','Vigência','Prêmio Pago'].map(h => (
                  <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
                ))}
              </View>
              {expAnterior.map((e, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.tableCell}>{e.seguradora ?? '—'}</Text>
                  <Text style={styles.tableCell}>{e.corretor ?? '—'}</Text>
                  <Text style={styles.tableCell}>{e.ramo ?? '—'}</Text>
                  <Text style={styles.tableCell}>{e.vigencia ?? '—'}</Text>
                  <Text style={styles.tableCell}>{BRL(e.premio_pago)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Condição Atual */}
        {condicaoAtual.length > 0 && (
          <>
            <Secao titulo="Condição Atual" />
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {['LMG','Ramo','Taxa','P.O.S.','Prêmio Mínimo'].map(h => (
                  <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
                ))}
              </View>
              {condicaoAtual.map((c, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.tableCell}>{c.lmg ?? '—'}</Text>
                  <Text style={styles.tableCell}>{c.ramo ?? '—'}</Text>
                  <Text style={styles.tableCell}>{c.taxa ?? '—'}</Text>
                  <Text style={styles.tableCell}>{c.pos ?? '—'}</Text>
                  <Text style={styles.tableCell}>{BRL(c.premio_minimo)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Sinistros */}
        <Secao titulo="Sinistros" />
        <View style={styles.checkRow}>
          <Check checked={sinPeriodo === '12'} label="12 meses" />
          <Check checked={sinPeriodo === '24'} label="24 meses" />
          <Check checked={sinPeriodo === '36'} label="36 meses" />
          <Check checked={sinPeriodo === 'nao_houve'} label="Não houve" />
        </View>
        {sinistros.length > 0 && (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              {['Data','Ramo','Local Origem','Local Destino','Valor Prejuízo'].map(h => (
                <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
              ))}
            </View>
            {sinistros.map((s, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={styles.tableCell}>{s.data_sinistro ?? '—'}</Text>
                <Text style={styles.tableCell}>{s.ramo ?? '—'}</Text>
                <Text style={styles.tableCell}>{s.local_origem ?? '—'}</Text>
                <Text style={styles.tableCell}>{s.local_destino ?? '—'}</Text>
                <Text style={styles.tableCell}>{BRL(s.valor_prejuizo)}</Text>
              </View>
            ))}
          </View>
        )}
        {cotacao.sinistros_detalhes && <Campo label="Detalhes sinistros" value={cotacao.sinistros_detalhes} />}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{nomeCorretora} — QAR Seguro de Transportes de Carga</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* ── PÁGINA 3 ── */}
      <Page size="A4" style={styles.page}>

        <View style={{ borderBottomWidth: 1, borderBottomColor: corP, marginBottom: 8, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: corP }}>{nomeCorretora}</Text>
          <Text style={{ fontSize: 8, color: '#888' }}>QAR — Seguro de Transportes de Carga</Text>
        </View>

        {/* DDRs */}
        {ddrs.length > 0 && (
          <>
            <Secao titulo="DDRs" />
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {['Embarcador','Seguradora','LMG','Vigência'].map(h => (
                  <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
                ))}
              </View>
              {ddrs.map((d, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.tableCell}>{d.embarcador ?? '—'}</Text>
                  <Text style={styles.tableCell}>{d.seguradora ?? '—'}</Text>
                  <Text style={styles.tableCell}>{d.lmg ?? '—'}</Text>
                  <Text style={styles.tableCell}>{d.vigencia ?? '—'}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Gerenciamento de Riscos */}
        {gerenciadoras.length > 0 && (
          <>
            <Secao titulo="Gerenciamento de Riscos" />
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {['Gerenciadora','Cadastro','Vitimologia','Monitoramento'].map(h => (
                  <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
                ))}
              </View>
              {gerenciadoras.map((g, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.tableCell}>{g.gerenciadora}</Text>
                  <Text style={styles.tableCell}>{sim(g.possui_cadastro)}</Text>
                  <Text style={styles.tableCell}>{sim(g.possui_vitimologia)}</Text>
                  <Text style={styles.tableCell}>{sim(g.possui_monitoramento)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {cotacao.gerenc_rastreador_fornecedor && (
          <Campo label="Rastreador / Fornecedor" value={`${cotacao.gerenc_rastreador_fornecedor}${cotacao.gerenc_rastreador_tipo ? ` — ${cotacao.gerenc_rastreador_tipo}` : ''}`} />
        )}
        {cotacao.gerenc_detalhes && <Campo label="Det. gerenciamento" value={cotacao.gerenc_detalhes} />}

        {/* Condições Pretendidas */}
        {condPretendidas.length > 0 && (
          <>
            <Secao titulo="Condições Pretendidas" />
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {['LMG','Ramo','Taxa','P.O.S. (Franquia)','Prêmio Mínimo'].map(h => (
                  <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
                ))}
              </View>
              {condPretendidas.map((c, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.tableCell}>{c.lmg ?? '—'}</Text>
                  <Text style={styles.tableCell}>{c.ramo ?? '—'}</Text>
                  <Text style={styles.tableCell}>{c.taxa ?? '—'}</Text>
                  <Text style={styles.tableCell}>{c.pos_franquia ?? '—'}</Text>
                  <Text style={styles.tableCell}>{BRL(c.premio_minimo)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Condições Particulares */}
        {cotacao.condicoes_particulares && (
          <>
            <Secao titulo="Condições Particulares" />
            <Text style={{ fontSize: 8, color: '#333', lineHeight: 1.4 }}>{cotacao.condicoes_particulares}</Text>
          </>
        )}

        {/* Declaração */}
        <Secao titulo="Declaração" />
        <Text style={styles.declaracao}>
          Declaro que as informações aqui presentes são verídicas e autorizo as seguradoras a realizar quaisquer pesquisas que julgarem necessárias para a apuração dos dados contidos neste questionário. Nesta forma estou ciente que a simples apresentação deste questionário junto às seguradoras do mercado não representa nenhum compromisso de nenhuma delas de aceitar o risco proposto. As propostas a serem apresentadas serão elaboradas com base nas informações contidas neste questionário, portanto tenho ciência que o mesmo fará parte integrante e inseparável da apólice caso haja contratação de seguro.
        </Text>

        {/* Assinatura */}
        <View style={[styles.grid2, { marginTop: 24 }]}>
          <View style={styles.col}>
            <View style={styles.assinaturaBox}>
              <Text style={styles.assinaturaLabel}>Assinatura e carimbo do proponente</Text>
            </View>
            <Text style={{ fontSize: 7.5, color: '#555', marginTop: 4 }}>
              Local: {cotacao.assinatura_local ?? '___________________________'}
            </Text>
          </View>
          <View style={styles.col}>
            <View style={styles.assinaturaBox}>
              <Text style={styles.assinaturaLabel}>Assinatura e carimbo do corretor</Text>
            </View>
            <Text style={{ fontSize: 7.5, color: '#555', marginTop: 4 }}>
              Data: {cotacao.assinatura_data ?? '____ / ____ / ________'}
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{nomeCorretora} — QAR Seguro de Transportes de Carga</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
