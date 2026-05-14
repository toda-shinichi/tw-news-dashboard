import { NextRequest, NextResponse } from 'next/server'
import { generateSummary } from '@/lib/ai'
import { cacheGet, cacheSet } from '@/lib/cache'
import { getAccumulatedNews } from '@/lib/newsStore'
import { TabRange, SummaryResponse, SummaryData } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const tab = (req.nextUrl.searchParams.get('tab') || 'today') as TabRange
  const force = req.nextUrl.searchParams.get('force') === '1'
  const cacheKey = `summary:${tab}`

  const cached = await cacheGet<SummaryResponse>(cacheKey)
  if (cached && !force) {
    return NextResponse.json({ ...cached, fromCache: true })
  }

  const [twItems, intlItems] = await Promise.all([
    getAccumulatedNews('tw', tab, force),
    getAccumulatedNews('intl', tab, force),
  ])
  const allItems = [...twItems, ...intlItems]

  const data: SummaryData = await generateSummary(allItems)

  const response: SummaryResponse = {
    data,
    generatedAt: new Date().toISOString(),
    fromCache: false,
  }

  await cacheSet(cacheKey, response)
  return NextResponse.json(response)
}
