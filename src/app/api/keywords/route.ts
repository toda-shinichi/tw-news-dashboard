import { NextRequest, NextResponse } from 'next/server'
import { computeKeywordCounts } from '@/lib/utils'
import { cacheGet, cacheSet } from '@/lib/cache'
import { getAccumulatedNews } from '@/lib/newsStore'
import { TabRange, KeywordsResponse } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function GET(req: NextRequest) {
  const tab = (req.nextUrl.searchParams.get('tab') || 'today') as TabRange
  const force = req.nextUrl.searchParams.get('force') === '1'
  const cacheKey = `keywords:${tab}`

  const cached = await cacheGet<KeywordsResponse>(cacheKey)
  if (cached && !force) {
    return NextResponse.json({ ...cached, fromCache: true })
  }

  const [twItems, intlItems] = await Promise.all([
    getAccumulatedNews('tw', tab, force, true),
    getAccumulatedNews('intl', tab, force, true),
  ])
  const allItems = [...twItems, ...intlItems]

  // Filter to past 12h for more timely keyword extraction
  const cutoff12h = Date.now() - 12 * 3600_000
  const recent = allItems.filter(i => new Date(i.publishedAt).getTime() >= cutoff12h)
  const feedItems = recent.length >= 20 ? recent : allItems

  // Top 10 keywords from Chinese titles only
  const chineseItems = feedItems.filter(i => /[一-鿿]/.test(i.title))
  const keywords = computeKeywordCounts(chineseItems.map(i => i.title), 10)

  const response: KeywordsResponse = { keywords, fromCache: false }
  await cacheSet(cacheKey, response, 900) // 15-min cache
  return NextResponse.json(response)
}
