import { NextRequest, NextResponse } from 'next/server'
import { getAccumulatedNews } from '@/lib/newsStore'
import { cacheSet } from '@/lib/cache'

export const runtime = 'nodejs'
export const maxDuration = 60

// Triggered by Vercel Cron every hour (vercel.json: "0 * * * *").
// Force-refreshes news data and invalidates derived caches so the next
// user request regenerates summary, hotlist, and news responses fresh.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const started = Date.now()

  const [tw, intl] = await Promise.allSettled([
    getAccumulatedNews('tw',   'today', true),
    getAccumulatedNews('intl', 'today', true),
  ])

  // Invalidate derived caches so they regenerate on next user request
  await Promise.allSettled([
    cacheSet('news:resp:v2:today:tw',   null, 1),
    cacheSet('news:resp:v2:today:intl', null, 1),
    cacheSet('summary:v2:today',        null, 1),
    cacheSet('keywords:today',          null, 1),
    cacheSet('hotlist:today',           null, 1),
  ])

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - started,
    updatedAt: new Date().toISOString(),
    tw:   tw.status   === 'fulfilled' ? tw.value.length   : 'error',
    intl: intl.status === 'fulfilled' ? intl.value.length : 'error',
  })
}
