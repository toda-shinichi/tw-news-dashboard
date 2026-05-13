import { NextRequest, NextResponse } from 'next/server'
import { fetchAllRSS } from '@/lib/rss'
import { extractKeywords } from '@/lib/ai'
import { cacheGet, cacheSet } from '@/lib/cache'
import { filterByDateRange } from '@/lib/utils'
import { TabRange, KeywordsResponse } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 20

export async function GET(req: NextRequest) {
  const tab = (req.nextUrl.searchParams.get('tab') || 'today') as TabRange
  const cacheKey = `keywords:${tab}`

  const cached = await cacheGet<KeywordsResponse>(cacheKey)
  if (cached) {
    return NextResponse.json({ ...cached, fromCache: true })
  }

  const allItems = await fetchAllRSS()
  const filtered = filterByDateRange(allItems, tab)

  const keywords = await extractKeywords(filtered)

  const response: KeywordsResponse = {
    keywords,
    fromCache: false,
  }

  await cacheSet(cacheKey, response)
  return NextResponse.json(response)
}
