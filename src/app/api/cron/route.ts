import { NextRequest, NextResponse } from 'next/server'
import { getAccumulatedNews } from '@/lib/newsStore'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Vercel automatically sets Authorization: Bearer <CRON_SECRET> for cron jobs.
  // When CRON_SECRET is set, reject any call that doesn't carry it.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const started = Date.now()

  // Force-refresh both columns — bypasses 30-min throttle
  await Promise.all([
    getAccumulatedNews('tw',   'month', true),
    getAccumulatedNews('intl', 'month', true),
  ])

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - started,
    updatedAt: new Date().toISOString(),
  })
}
