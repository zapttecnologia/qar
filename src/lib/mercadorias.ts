// Lista curada de tipos de mercadoria comuns em seguro de transporte de carga.
// O campo no formulário continua sendo texto livre — esta lista alimenta apenas
// as sugestões do autocomplete. Para incluir um novo tipo, basta adicionar aqui.
export const TIPOS_MERCADORIA: string[] = [
  'Açúcar', 'Achocolatados', 'Aço', 'Adubos e fertilizantes', 'Água mineral',
  'Algodão', 'Alimentos congelados', 'Alimentos perecíveis', 'Alumínio', 'Amendoim',
  'Amido e féculas', 'Aparas de papel', 'Aparelhos de som', 'Areia e brita', 'Arames',
  'Argamassa', 'Armarinhos', 'Arroz', 'Artefatos de borracha', 'Artefatos de plástico',
  'Artigos de decoração', 'Artigos esportivos', 'Autopeças', 'Aveia', 'Azeite e óleos comestíveis',
  'Bagagens e mudanças', 'Balas e confeitos', 'Baterias automotivas', 'Bebidas alcoólicas',
  'Bebidas não alcoólicas', 'Biscoitos e bolachas', 'Bobinas de aço', 'Bombas hidráulicas',
  'Borracha natural', 'Brinquedos',
  'Cabos e fios elétricos', 'Cacau', 'Café em grão', 'Café torrado e moído', 'Cal',
  'Calçados', 'Cana-de-açúcar', 'Carga fracionada', 'Carga geral', 'Carga refrigerada',
  'Cargas indivisíveis', 'Carne bovina', 'Carne de frango', 'Carne suína', 'Celulares e smartphones',
  'Celulose', 'Cerâmica e porcelanato', 'Cereais', 'Cerveja', 'Chá', 'Chapas metálicas',
  'Chocolate', 'Cimento', 'Cloro', 'Cobre', 'Colchões', 'Componentes eletrônicos',
  'Compressores', 'Computadores e notebooks', 'Condimentos e temperos', 'Confecções',
  'Conservas e enlatados', 'Contêineres', 'Cosméticos e perfumaria', 'Couro e peles',
  'Defensivos agrícolas', 'Detergentes e saneantes', 'Documentos e valores',
  'Doces e sobremesas', 'Drones',
  'Eletrodomésticos', 'Eletroportáteis', 'Embalagens de papelão', 'Embalagens plásticas',
  'Encomendas expressas', 'Equipamentos de informática', 'Equipamentos hospitalares',
  'Equipamentos industriais', 'Esquadrias', 'Etanol',
  'Farinha de trigo', 'Feijão', 'Ferragens', 'Ferramentas', 'Ferro gusa', 'Fertilizantes',
  'Filmes plásticos', 'Fios e tecidos', 'Frutas', 'Fumo e tabaco',
  'Gases industriais', 'Gasolina', 'Geradores', 'Gesso', 'GLP (gás liquefeito de petróleo)', 'Grãos',
  'Herbicidas', 'Hortifrúti',
  'Implementos agrícolas', 'Impressoras', 'Insumos farmacêuticos', 'Iogurtes',
  'Joias e metais preciosos',
  'Laticínios', 'Legumes', 'Leite em pó', 'Livros e impressos', 'Louças sanitárias', 'Lubrificantes',
  'Macarrão e massas', 'Madeira em tora', 'Madeira serrada', 'Malhas', 'Margarina',
  'Máquinas agrícolas', 'Máquinas e equipamentos', 'Máquinas usadas', 'Material de construção',
  'Material de escritório', 'Material de limpeza', 'Material elétrico', 'Material médico-hospitalar',
  'Medicamentos', 'Medicamentos termolábeis', 'Mel', 'Metais não ferrosos', 'Milho',
  'Monitores', 'Motocicletas', 'Motores automotivos', 'Motores elétricos', 'Móveis',
  'Mudanças residenciais',
  'Obras de arte', 'Óleo de soja', 'Óleo diesel', 'Órteses e próteses', 'Ovos',
  'Papel', 'Papelão', 'Peixes e frutos do mar', 'Perfis metálicos', 'Placas eletrônicas',
  'Plásticos e polímeros', 'Pneus', 'Produtos de higiene pessoal', 'Produtos perigosos',
  'Produtos químicos', 'Produtos siderúrgicos',
  'Queijos',
  'Ração animal', 'Refrigerantes', 'Resíduos e recicláveis', 'Resinas plásticas', 'Roupas e vestuário',
  'Sal', 'Sementes', 'Semicondutores', 'Servidores e equipamentos de TI', 'Soja',
  'Solventes', 'Sorvetes', 'Sucata metálica', 'Sucos',
  'Tablets', 'Tarugos', 'Tecidos', 'Telefonia e acessórios', 'Televisores',
  'Tijolos e blocos', 'Tintas e vernizes', 'Tratores', 'Trigo', 'Tubos e conexões',
  'Utensílios domésticos', 'Utilidades domésticas',
  'Vacinas', 'Veículos automotores', 'Veículos zero km', 'Vergalhões', 'Vidros',
  'Videogames', 'Vinho',
  'Zinco',
].sort((a, b) => a.localeCompare(b, 'pt-BR'))

// Remove acentos para que "acucar" também encontre "Açúcar"
const ACENTOS = new RegExp('[\\u0300-\\u036f]', 'g')
function normalizar(s: string) {
  return s.normalize('NFD').replace(ACENTOS, '').toLowerCase().trim()
}

// Prioriza os que COMEÇAM com o termo digitado; depois os que apenas contêm.
export function buscarMercadorias(termo: string, limite = 10): string[] {
  const t = normalizar(termo)
  if (!t) return []
  const comeca: string[] = []
  const contem: string[] = []
  for (const item of TIPOS_MERCADORIA) {
    const alvo = normalizar(item)
    if (alvo.startsWith(t)) comeca.push(item)
    else if (alvo.includes(t)) contem.push(item)
  }
  return [...comeca, ...contem].slice(0, limite)
}
