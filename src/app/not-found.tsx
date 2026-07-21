'use client'

import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page, #f0f2f5)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 48, fontWeight: 700, color: '#0f2744', marginBottom: 8 }}>
          QAR<span style={{ fontWeight: 300, color: '#1a6fbf' }}>tech</span>
        </div>
        <p style={{ fontSize: 16, color: '#6b7280', margin: '0 0 24px' }}>Página não encontrada</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => router.back()}
            style={{ padding: '9px 18px', background: 'none', border: '1px solid #e2e6ea', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#374151' }}>
            Voltar
          </button>
          <button onClick={() => router.push('/dashboard')}
            style={{ padding: '9px 18px', background: '#0f2744', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#fff', fontWeight: 500 }}>
            Ir para o início
          </button>
        </div>
      </div>
    </div>
  )
}
