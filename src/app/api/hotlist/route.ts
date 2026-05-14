import { NextRequest, NextResponse } from 'next/server'
import { extractHotList, HotList } from '@/lib/ai'
import { cacheGet, cacheSet } from '@/lib/cache'
import { filterByDateRange, dedupeByTitle } from '@/lib/utils'
import { TabRange, NewsResponse } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

interface HotListResponse {
  tw: HotList
  intl: HotList
  fromCache: boolean
}

export async function GET(req: NextRequest) {
  const tab = (req.nextUrl.searchParams.get('tab') || 'today') as TabRange
  const force = req.nextUrl.searchParams.get('force') === '1'
  const cacheKey = `hotlist:${tab}`

  const cached = await cacheGet<HotListResponse>(cacheKey)
  if (cached && !force) {
    return NextResponse.json({ ...cached, fromCache: true })
  }

  // Reuse already-cached news items to avoid duplicate RSS fetches
  const [twCache, intlCache] = await Promise.all([
    cacheGet<NewsResponse>(`news:${tab}:tw`),
    cacheGet<NewsResponse>(`news:${tab}:intl`),
  ])

  // Fall back to fresh fetch only if cache is empty
  let twItems = twCache?.items ?? []
  let intlItems = intlCache?.items ?? []

  if (twItems.length === 0 || intlItems.length === 0) {
    const { fetchAllRSS } = await import('@/lib/rss')
    const [twRaw, intlRaw] = await Promise.all([
      twItems.length === 0 ? fetchAllRSS('tw') : Promise.resolve([]),
      intlItems.length === 0 ? fetchAllRSS('intl') : Promise.resolve([]),
    ])
    if (twRaw.length > 0) twItems = dedupeByTitle(filterByDateRange(twRaw, tab))
    if (intlRaw.length > 0) intlItems = dedupeByTitle(filterByDateRange(intlRaw, tab))
  }

  const [twHot, intlHot] = await Promise.all([
    extractHotList(twItems.map(i => i.title), 'zh'),
    extractHotList(intlItems.map(i => i.title), 'en'),
  ])

  const response: HotListResponse = { tw: twHot, intl: intlHot, fromCache: false }
  await cacheSet(cacheKey, response)
  return NextResponse.json(response)
}
