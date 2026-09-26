import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PLAYERS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

type TwitchStream = {
  user_login: string
}

type TwitchStreamsResponse = {
  data?: TwitchStream[]
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
    const twitchUsers = new Map(
      (savedSettings ?? []).map((row: { jugador_id: number; twitch_user: string | null }) => [
        row.jugador_id,
        row.twitch_user?.trim() ?? '',
      ])
    )
    const playersWithTwitch = PLAYERS.filter((player) =>
      (twitchUsers.get(player.id) ?? player.twitchUser).trim()
    )
    const query = new URLSearchParams(
      playersWithTwitch.map((player) => [
        'user_login',
        (twitchUsers.get(player.id) ?? player.twitchUser).trim().toLowerCase(),
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
        (twitchUsers.get(player.id) ?? player.twitchUser) &&
          liveUsers.has((twitchUsers.get(player.id) ?? player.twitchUser).toLowerCase())
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
          (twitchUsers.get(player.id) ?? player.twitchUser) &&
          liveUsers.has((twitchUsers.get(player.id) ?? player.twitchUser).toLowerCase())
      ).map((player) => player.id),
    })
  } catch (error) {
    console.error('Error comprobando directos:', error)
    return NextResponse.json({ error: 'Error comprobando los directos.' }, { status: 500 })
  }
}
