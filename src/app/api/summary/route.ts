import { NextRequest, NextResponse } from 'next/server'
import { fetchAllRSS } from '@/lib/rss'
import { generateSummary } from '@/lib/ai'
import { cacheGet, cacheSet } from '@/lib/cache'
import { filterByDateRange } from '@/lib/utils'
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

  const allItems = await fetchAllRSS()
  const filtered = filterByDateRange(allItems, tab)

  const data: SummaryData = await generateSummary(filtered)

  const response: SummaryResponse = {
    data,
    generatedAt: new Date().toISOString(),
    fromCache: false,
  }

  await cacheSet(cacheKey, response)
  return NextResponse.json(response)
}
