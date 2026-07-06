import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cargotech — Cotações de Seguro de Transporte',
  description: 'Plataforma de gestão de cotações de seguro de carga',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body>{children}</body>
    </html>
  )
}
