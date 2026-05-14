import { NextRequest, NextResponse } from 'next/server'
import { extractKeywords } from '@/lib/ai'
import { cacheGet, cacheSet } from '@/lib/cache'
import { getAccumulatedNews } from '@/lib/newsStore'
import { TabRange, KeywordsResponse } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 20

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

  const keywords = await extractKeywords(allItems)

  const response: KeywordsResponse = {
    keywords,
    fromCache: false,
  }

  await cacheSet(cacheKey, response)
  return NextResponse.json(response)
}
