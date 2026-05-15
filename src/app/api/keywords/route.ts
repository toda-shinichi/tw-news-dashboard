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

  // Real frequency count across all titles — no AI guessing
  const keywords = computeKeywordCounts(allItems.map(i => i.title), 30)

  const response: KeywordsResponse = { keywords, fromCache: false }
  await cacheSet(cacheKey, response, 900) // 15-min cache
  return NextResponse.json(response)
}
