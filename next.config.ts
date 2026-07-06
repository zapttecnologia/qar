import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // App requer autenticação — desabilita tentativa de pre-render estático
  trailingSlash: false,
}

export default nextConfig
