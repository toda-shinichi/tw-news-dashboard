import { NextRequest, NextResponse } from 'next/server'
import { analyzeSentiment } from '@/lib/ai'
import { cacheGet, cacheSet } from '@/lib/cache'
import { dedupeByTitle } from '@/lib/utils'
import { getAccumulatedNews } from '@/lib/newsStore'
import { TabRange, NewsColumn, NewsResponse } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export interface PaginatedNewsResponse extends NewsResponse {
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams
  const tab    = (sp.get('tab')  || 'today') as TabRange
  const column = (sp.get('col')  || 'tw')    as NewsColumn
  const force  = sp.get('force') === '1'
  const q      = sp.get('q')?.trim() || ''
  const cat    = sp.get('cat')   || ''
  const page   = Math.max(1, parseInt(sp.get('page')  || '1'))
  const limit  = Math.min(200, Math.max(1, parseInt(sp.get('limit') || '150')))

  const isPaginated = sp.has('page') || sp.has('limit') || q || cat

  // Only use response cache for the default (unpaginated, no search) requests
  const cacheKey = `news:resp:${tab}:${column}`
  if (!isPaginated) {
    const cached = await cacheGet<PaginatedNewsResponse>(cacheKey)
    if (cached && !force) return NextResponse.json({ ...cached, fromCache: true })
  }

  const rawItems = await getAccumulatedNews(column, tab, force)

  let items = dedupeByTitle(rawItems)
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

  const sentimentMap = await analyzeSentiment(pageItems)
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
