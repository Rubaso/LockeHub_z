export async function POST(request: Request) {
  try {
    const body = await request.json() as { paste?: unknown }
    const paste = typeof body.paste === 'string' ? body.paste.trim() : ''
    if (!paste) return Response.json({ error: 'El equipo está vacío.' }, { status: 400 })

    const form = new URLSearchParams({ paste })
    const response = await fetch('https://pokepast.es/create', {
      method: 'POST',
      body: form,
      redirect: 'manual',
      cache: 'no-store',
    })
    const location = response.headers.get('location')
    if (!location) {
      const detail = await response.text()
      console.error('PokéPaste no devolvió una URL:', response.status, detail.slice(0, 300))
      return Response.json({ error: 'PokéPaste no devolvió un enlace.' }, { status: 502 })
    }

    return Response.json({ url: new URL(location, 'https://pokepast.es').toString() })
  } catch (error) {
    console.error('No se pudo crear el PokéPaste:', error)
    return Response.json({ error: 'No se pudo conectar con PokéPaste.' }, { status: 502 })
  }
}
