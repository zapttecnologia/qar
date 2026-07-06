import { ReactQueryProvider } from '@/components/layout/ReactQueryProvider'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      {children}
    </ReactQueryProvider>
  )
}
