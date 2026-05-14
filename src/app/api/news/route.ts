import { NextRequest, NextResponse } from 'next/server'
import { fetchAllRSS } from '@/lib/rss'
import { fetchNewsAPI } from '@/lib/newsapi'
import { fetchGDELT, getGDELTTimespan } from '@/lib/gdelt'
import { analyzeSentiment } from '@/lib/ai'
import { cacheGet, cacheSet } from '@/lib/cache'
import { filterByDateRange, dedupeByTitle, classifyCategory } from '@/lib/utils'
import { NewsItem, TabRange, NewsColumn, NewsResponse } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const tab = (req.nextUrl.searchParams.get('tab') || 'today') as TabRange
  const column = (req.nextUrl.searchParams.get('col') || 'tw') as NewsColumn
  const force = req.nextUrl.searchParams.get('force') === '1'

  const cacheKey = `news:${tab}:${column}`
  const cached = await cacheGet<NewsResponse>(cacheKey)
  if (cached && !force) {
    return NextResponse.json({ ...cached, fromCache: true })
  }

  let items: NewsItem[] = []

  if (column === 'tw') {
    const [rssItems, newsApiItems] = await Promise.all([
      fetchAllRSS('tw'),
      fetchNewsAPI(),
    ])
    items = [...rssItems, ...newsApiItems]
  } else {
    const gdeltTimespan = getGDELTTimespan(tab)
    const [rssIntl, gdeltItems] = await Promise.all([
      fetchAllRSS('intl'),
      fetchGDELT(gdeltTimespan),
    ])
    items = [...rssIntl, ...gdeltItems]
  }

  let filtered = filterByDateRange(items, tab)
  filtered = dedupeByTitle(filtered) as NewsItem[]
  filtered.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
  filtered = filtered.slice(0, 60)

  const sentimentMap = await analyzeSentiment(filtered)
  const withSentiment: NewsItem[] = filtered.map(item => ({
    ...item,
    sentiment: sentimentMap[item.id] ?? 'neutral',
    category: item.category ?? classifyCategory(item.title),
  }))

  const response: NewsResponse = {
    items: withSentiment,
    updatedAt: new Date().toISOString(),
    fromCache: false,
  }

  await cacheSet(cacheKey, response)
  return NextResponse.json(response)
}
