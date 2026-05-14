import { NextRequest, NextResponse } from 'next/server'
import { analyzeSentiment } from '@/lib/ai'
import { cacheGet, cacheSet } from '@/lib/cache'
import { dedupeByTitle } from '@/lib/utils'
import { getAccumulatedNews } from '@/lib/newsStore'
import { TabRange, NewsColumn, NewsResponse } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const tab = (req.nextUrl.searchParams.get('tab') || 'today') as TabRange
  const column = (req.nextUrl.searchParams.get('col') || 'tw') as NewsColumn
  const force = req.nextUrl.searchParams.get('force') === '1'

  const cacheKey = `news:resp:${tab}:${column}`
  const cached = await cacheGet<NewsResponse>(cacheKey)
  if (cached && !force) {
    return NextResponse.json({ ...cached, fromCache: true })
  }

  const rawItems = await getAccumulatedNews(column, tab, force)

  let filtered = dedupeByTitle(rawItems)
  filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  filtered = filtered.slice(0, 60)

  const sentimentMap = await analyzeSentiment(filtered)
  const withSentiment = filtered.map(item => ({
    ...item,
    sentiment: sentimentMap[item.id] ?? 'neutral',
  }))

  const response: NewsResponse = {
    items: withSentiment,
    updatedAt: new Date().toISOString(),
    fromCache: false,
  }

  // 30-min cache matches the store's fetch interval
  await cacheSet(cacheKey, response, 1800)
  return NextResponse.json(response)
}
