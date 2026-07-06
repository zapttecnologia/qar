import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cargotech — Cotações de Seguro de Transporte',
  description: 'Plataforma de gestão de cotações de seguro de carga',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  )
}
