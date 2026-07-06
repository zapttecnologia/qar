// Este arquivo força todas as páginas do grupo (dashboard) a serem dinâmicas
// evitando tentativa de pre-render sem variáveis de ambiente
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
