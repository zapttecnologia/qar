import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticação
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const corretoraId = formData.get('corretora_id') as string

    if (!file || !corretoraId) {
      return NextResponse.json({ error: 'Arquivo e corretora_id são obrigatórios' }, { status: 400 })
    }

    // Valida tipo do arquivo
    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!tiposPermitidos.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use PNG, JPG ou SVG.' }, { status: 400 })
    }

    // Valida tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 2MB.' }, { status: 400 })
    }

    // Salva na pasta public/logos
    const ext = file.name.split('.').pop() ?? 'png'
    const nomeArquivo = `${corretoraId}.${ext}`
    const pasta = join(process.cwd(), 'public', 'logos')
    const caminho = join(pasta, nomeArquivo)

    await mkdir(pasta, { recursive: true })

    const bytes = await file.arrayBuffer()
    await writeFile(caminho, Buffer.from(bytes))

    // Retorna a URL pública
    const url = `/logos/${nomeArquivo}`
    return NextResponse.json({ url })

  } catch (e) {
    console.error('[upload-logo]', e)
    return NextResponse.json({ error: 'Erro ao salvar arquivo' }, { status: 500 })
  }
}
