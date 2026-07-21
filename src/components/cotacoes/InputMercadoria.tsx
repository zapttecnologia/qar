'use client'

import { useState, useRef, useEffect } from 'react'
import { buscarMercadorias } from '@/lib/mercadorias'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

// Campo de texto livre com sugestões de tipos de mercadoria.
// Digitar "ce" lista primeiro os que começam com "ce" (Celulares, Cereais, Cerveja...).
export function InputMercadoria({ value, onChange, placeholder = 'Tipo de mercadoria' }: Props) {
  const [aberto, setAberto] = useState(false)
  const [destaque, setDestaque] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  const sugestoes = aberto ? buscarMercadorias(value) : []

  useEffect(() => {
    function cliqueFora(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', cliqueFora)
    return () => document.removeEventListener('mousedown', cliqueFora)
  }, [])

  function selecionar(v: string) {
    onChange(v)
    setAberto(false)
    setDestaque(0)
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { setAberto(false); return }
    if (!sugestoes.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setDestaque(d => (d + 1) % sugestoes.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setDestaque(d => (d - 1 + sugestoes.length) % sugestoes.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selecionar(sugestoes[destaque])
    }
  }

  // width:100% + flex-basis auto reproduz o dimensionamento do <input> que havia aqui,
  // para o campo dividir a linha igualmente com o de Embarcador
  return (
    <div ref={boxRef} style={{ position: 'relative', width: '100%', minWidth: 0 }}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setAberto(true); setDestaque(0) }}
        onFocus={() => setAberto(true)}
        onKeyDown={aoTeclar}
        placeholder={placeholder}
        autoComplete="off"
        className="field-input"
        style={{ fontSize: 12 }}
      />
      {aberto && sugestoes.length > 0 && (
        <ul style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 30,
          margin: 0, padding: 4, listStyle: 'none', maxHeight: 200, overflowY: 'auto',
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,.28)',
        }}>
          {sugestoes.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => selecionar(s)}
                onMouseEnter={() => setDestaque(i)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px',
                  fontSize: 12, border: 'none', borderRadius: 4, cursor: 'pointer',
                  background: i === destaque ? 'var(--accent-light)' : 'transparent',
                  color: i === destaque ? 'var(--accent-text)' : 'var(--text-1)',
                }}>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
