import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'QARtech — Sistema de Cotações',
  description: 'QARtech — Sistema de cotações de seguro de transporte de carga',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon-qartech.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/icon-qartech.svg" />
      </head>
      <body>{children}</body>
    </html>
  )
}
