import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PLAYERS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { twitchLogin } from '@/lib/twitch'

type TwitchStream = {
  user_login: string
}

type TwitchStreamsResponse = {
  data?: TwitchStream[]
}

async function logTwitchFailure(stage: string, response: Response) {
  let details: { error?: unknown; message?: unknown } = {}

  try {
    const body: unknown = await response.clone().json()
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>
      details = {
        error: record.error,
        message: record.message,
      }
    }
  } catch (error) {
    console.error(`Twitch ${stage} returned a non-JSON error body`, {
      status: response.status,
      statusText: response.statusText,
      requestId: response.headers.get('Twitch-Trace-Id'),
      parseError: error instanceof Error ? error.message : 'Unknown parse error',
    })
    return
  }

  console.error(`Twitch ${stage} request failed`, {
    status: response.status,
    statusText: response.statusText,
    requestId: response.headers.get('Twitch-Trace-Id'),
    error: typeof details.error === 'string' ? details.error.slice(0, 200) : undefined,
    message: typeof details.message === 'string' ? details.message.slice(0, 500) : undefined,
  })
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Faltan TWITCH_CLIENT_ID o TWITCH_CLIENT_SECRET.' },
      { status: 500 }
    )
  }

  if (!supabaseUrl || (!serviceRoleKey && !supabase)) {
    return NextResponse.json({ error: 'Falta configurar Supabase.' }, { status: 500 })
  }

  try {
    const tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
      { method: 'POST', cache: 'no-store' }
    )

    if (!tokenResponse.ok) {
      await logTwitchFailure('token', tokenResponse)
      return NextResponse.json({ error: 'No se pudo autenticar con Twitch.' }, { status: 502 })
    }

    const tokenData = (await tokenResponse.json()) as { access_token?: string }
    if (!tokenData.access_token) {
      return NextResponse.json({ error: 'Twitch no devolvió un token válido.' }, { status: 502 })
    }

    const database = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey)
      : supabase
    const { data: savedSettings } = database
      ? await database.from('directos').select('jugador_id, twitch_user')
      : { data: null }
    const savedTwitchUsers = new Map(
      (savedSettings ?? []).map((row: { jugador_id: number; twitch_user: string | null }) => [
        row.jugador_id,
        row.twitch_user,
      ])
    )
    const twitchLogins = new Map(
      PLAYERS.flatMap((player) => {
        const login = twitchLogin(
          savedTwitchUsers.get(player.id) ?? player.twitchUser
        )
        return login ? [[player.id, login] as const] : []
      })
    )
    const playersWithTwitch = PLAYERS.filter((player) => twitchLogins.has(player.id))
    const query = new URLSearchParams(
      playersWithTwitch.map((player) => [
        'user_login',
        twitchLogins.get(player.id) ?? '',
      ])
    )
    const streamsResponse = await fetch(
      `https://api.twitch.tv/helix/streams?${query.toString()}`,
      {
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        cache: 'no-store',
      }
    )

    if (!streamsResponse.ok) {
      await logTwitchFailure('streams', streamsResponse)
      return NextResponse.json({ error: 'No se pudo consultar el estado de Twitch.' }, { status: 502 })
    }

    const streamsData = (await streamsResponse.json()) as TwitchStreamsResponse
    const liveUsers = new Set(
      (streamsData.data ?? []).map((stream) => stream.user_login.toLowerCase())
    )
    const now = new Date().toISOString()
    const rows = PLAYERS.map((player) => ({
      jugador_id: player.id,
      is_live: Boolean(
        twitchLogins.has(player.id) &&
          liveUsers.has(twitchLogins.get(player.id) ?? '')
      ),
      updated_at: now,
    }))

    if (!database) {
      return NextResponse.json({ error: 'No se pudo inicializar Supabase.' }, { status: 500 })
    }

    const { error } = await database
      .from('directos')
      .upsert(rows, { onConflict: 'jugador_id' })

    if (error) {
      console.error('Error guardando estados de Twitch:', error)
      return NextResponse.json({ error: 'No se pudieron guardar los estados de Twitch.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      liveCount: liveUsers.size,
      livePlayers: PLAYERS.filter(
        (player) =>
          twitchLogins.has(player.id) &&
          liveUsers.has(twitchLogins.get(player.id) ?? '')
      ).map((player) => player.id),
    })
  } catch (error) {
    console.error('Error comprobando directos:', error)
    return NextResponse.json({ error: 'Error comprobando los directos.' }, { status: 500 })
  }
}
