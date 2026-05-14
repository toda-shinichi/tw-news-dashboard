import { NextResponse } from 'next/server'
import { cacheGet } from '@/lib/cache'
import { NewsItem } from '@/types'

export const runtime = 'nodejs'

export async function GET() {
  const [twItems, intlItems, twFetch, intlFetch, twExt] = await Promise.all([
    cacheGet<NewsItem[]>('news:acc:tw'),
    cacheGet<NewsItem[]>('news:acc:intl'),
    cacheGet<number>('news:fetch:tw'),
    cacheGet<number>('news:fetch:intl'),
    cacheGet<number>('news:ext:tw'),
  ])

  const fmt = (ts: number | null) =>
    ts ? new Date(ts).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : '尚未更新'

  return NextResponse.json({
    tw:   { count: twItems?.length ?? 0,   lastFetch: fmt(twFetch),   lastExternal: fmt(twExt) },
    intl: { count: intlItems?.length ?? 0, lastFetch: fmt(intlFetch), lastExternal: '—' },
  })
}
