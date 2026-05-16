import { NextRequest, NextResponse, after } from 'next/server'
import { analyzeSentiment } from '@/lib/ai'
import { cacheGet, cacheSet } from '@/lib/cache'
import { dedupeByTitle, isChineseText } from '@/lib/utils'
import { getAccumulatedNews } from '@/lib/newsStore'
import { TabRange, NewsColumn, NewsResponse, SentimentLabel, NewsItem } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const SENTIMENT_KEY = 'sentiment:v1'
const SENTIMENT_TTL = 90_000 // matches news acc TTL (~25h)
// Max items to analyze synchronously per request; remaining done in background
const SENTIMENT_SYNC_LIMIT = 300

export interface PaginatedNewsResponse extends NewsResponse {
  total: number
  page: number
  limit: number
  totalPages: number
}

async function getAndUpdateSentiment(items: NewsItem[]): Promise<Record<string, SentimentLabel>> {
  const cached = await cacheGet<Record<string, SentimentLabel>>(SENTIMENT_KEY) ?? {}

  // Only analyze items not yet in the persistent cache
  const uncached = items.filter(item => !cached[item.id])

  if (uncached.length === 0) return cached

  const syncBatch = uncached.slice(0, SENTIMENT_SYNC_LIMIT)
  const asyncBatch = uncached.slice(SENTIMENT_SYNC_LIMIT)

  const newSentiment = await analyzeSentiment(syncBatch)
  const merged = { ...cached, ...newSentiment }

  if (asyncBatch.length > 0) {
    // Analyze remaining items after response is sent
    after(async () => {
      const moreSentiment = await analyzeSentiment(asyncBatch)
      const latest = await cacheGet<Record<string, SentimentLabel>>(SENTIMENT_KEY) ?? {}
      await cacheSet(SENTIMENT_KEY, { ...latest, ...moreSentiment }, SENTIMENT_TTL)
    })
  }

  await cacheSet(SENTIMENT_KEY, merged, SENTIMENT_TTL)
  return merged
}

export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams
  const tab    = (sp.get('tab')  || 'today') as TabRange
  const column = (sp.get('col')  || 'tw')    as NewsColumn
  const force  = sp.get('force') === '1'
  const q      = sp.get('q')?.trim() || ''
  const cat    = sp.get('cat')   || ''
  const page   = Math.max(1, parseInt(sp.get('page')  || '1'))
  const limit  = sp.has('limit') ? Math.min(2000, Math.max(1, parseInt(sp.get('limit')!))) : 2000

  const isPaginated = sp.has('page') || sp.has('limit') || q || cat

  // Only use response cache for the default (unpaginated, no search) requests
  const cacheKey = `news:resp:v3:${tab}:${column}`
  if (!isPaginated) {
    const cached = await cacheGet<PaginatedNewsResponse>(cacheKey)
    if (cached && !force) return NextResponse.json({ ...cached, fromCache: true })
  }

  const rawItems = await getAccumulatedNews(column, tab, force)

  let items = dedupeByTitle(rawItems).filter(item => isChineseText(item.title))
  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  // Apply keyword search
  if (q) {
    const lower = q.toLowerCase()
    items = items.filter(i =>
      i.title.toLowerCase().includes(lower) ||
      i.source.toLowerCase().includes(lower) ||
      i.summary?.toLowerCase().includes(lower)
    )
  }

  // Apply category filter
  if (cat && cat !== 'all') {
    const lifeCats = new Set(['life', 'entertainment', 'finance', 'tech'])
    items = items.filter(i =>
      cat === 'life' ? lifeCats.has(i.category ?? '') : i.category === cat
    )
  }

  const total      = items.length
  const totalPages = Math.ceil(total / limit)
  const pageItems  = items.slice((page - 1) * limit, page * limit)

  // Use persistent sentiment cache — only newly seen items are analyzed
  const sentimentMap = await getAndUpdateSentiment(pageItems)
  const withSentiment = pageItems.map(item => ({
    ...item,
    sentiment: sentimentMap[item.id] ?? 'neutral',
  }))

  const response: PaginatedNewsResponse = {
    items: withSentiment,
    updatedAt: new Date().toISOString(),
    fromCache: false,
    total,
    page,
    limit,
    totalPages,
  }

  if (!isPaginated) {
    await cacheSet(cacheKey, response, 1800)
  }
  return NextResponse.json(response)
}
