import { NextRequest, NextResponse } from 'next/server'
import { generateSummary } from '@/lib/ai'
import { cacheGet, cacheSet } from '@/lib/cache'
import { getAccumulatedNews } from '@/lib/newsStore'
import { saveSnapshot } from '@/lib/history'
import { TabRange, SummaryResponse, SummaryData } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const tab = (req.nextUrl.searchParams.get('tab') || 'today') as TabRange
  const force = req.nextUrl.searchParams.get('force') === '1'
  const cacheKey = `summary:${tab}`

  const cached = await cacheGet<SummaryResponse>(cacheKey)
  // Only serve cache if it has a valid (non-empty, non-error) overview
  const isValidCache = cached && cached.data?.overview &&
    !cached.data.overview.startsWith('AI 分析') &&
    !cached.data.overview.startsWith('目前無法') &&
    !cached.data.overview.startsWith('此時段')
  if (isValidCache && !force) {
    return NextResponse.json({ ...cached, fromCache: true })
  }

  const [twItems, intlItems] = await Promise.all([
    getAccumulatedNews('tw', tab, force, true),
    getAccumulatedNews('intl', tab, force, true),
  ])
  const allItems = [...twItems, ...intlItems]

  const data: SummaryData = await generateSummary(allItems)

  const response: SummaryResponse = {
    data,
    generatedAt: new Date().toISOString(),
    fromCache: false,
  }

  const isValid = !!(data.overview && !data.overview.startsWith('AI 分析') && !data.overview.startsWith('目前無法'))

  // Only cache successful results (30-min TTL to align with news refresh cycle)
  if (isValid) {
    await cacheSet(cacheKey, response, 1800)
  }
  return NextResponse.json(response)
}
