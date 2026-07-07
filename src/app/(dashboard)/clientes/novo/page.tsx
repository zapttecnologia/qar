'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSessao } from '@/hooks/useSessao'
import { criarCliente } from '@/lib/queries/clientes'
import { ClienteForm, type ClienteFormData } from '@/components/clientes/ClienteForm'

export default function NovoClientePage() {
  const router = useRouter()
  const { corretora } = useSessao()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(data: ClienteFormData) {
    if (!corretora) return
    setSalvando(true); setErro('')
    try {
      const cliente = await criarCliente({ corretora_id: corretora.id, ...data })
      router.push(`/clientes/${(cliente as unknown as Record<string,unknown>).id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErro(msg.includes('unique') ? 'Este CNPJ já está cadastrado.' : 'Erro ao salvar. Tente novamente.')
      setSalvando(false)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/clientes"
          style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)', textDecoration: 'none' }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 15 }} aria-hidden="true" />
        </Link>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Novo cliente</h1>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Cadastrar transportadora</p>
        </div>
      </div>

      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>
          {erro}
        </div>
      )}

      <div className="card" style={{ padding: 20 }}>
        <ClienteForm onSubmit={handleSubmit} salvando={salvando} submitLabel="Cadastrar cliente" />
      </div>
    </div>
  )
}
