import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { StatusCotacao } from '@/types/database'

// Combina classes Tailwind sem conflitos
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formata valor em Real brasileiro
export function formatBRL(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Formata CNPJ: 00.000.000/0001-00
export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

// Valida CNPJ (algoritmo completo)
export function validarCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return false
  if (/^(\d)\1+$/.test(digits)) return false

  const calc = (len: number) => {
    let sum = 0
    let pos = len - 7
    for (let i = len; i >= 1; i--) {
      sum += parseInt(digits.charAt(len - i)) * pos--
      if (pos < 2) pos = 9
    }
    const result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    return result === parseInt(digits.charAt(len))
  }
  return calc(12) && calc(13)
}

// Configuração visual de cada status de cotação
export const statusConfig: Record<StatusCotacao, { label: string; className: string }> = {
  rascunho: {
    label: 'Rascunho',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  em_analise: {
    label: 'Em análise',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  pendente_dados: {
    label: 'Pendente de dados',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  aprovada: {
    label: 'Aprovada',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  enviada: {
    label: 'Enviada',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  arquivada: {
    label: 'Arquivada',
    className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
  },
}

// Busca dados de CNPJ via BrasilAPI (Receita Federal)
export async function buscarDadosCNPJ(cnpj: string) {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) throw new Error('CNPJ inválido')

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
    headers: { 'Accept': 'application/json' },
  })
  if (!res.ok) throw new Error('CNPJ não encontrado na Receita Federal')

  return res.json()
}
