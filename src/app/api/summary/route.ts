import { NextRequest, NextResponse } from 'next/server'
import { generateSummary, NewsStats } from '@/lib/ai'
import { cacheGet, cacheSet } from '@/lib/cache'
import { getAccumulatedNews } from '@/lib/newsStore'
import { saveSnapshot } from '@/lib/history'
import { fetchSocialSignals } from '@/lib/social'
import { computeKeywordCounts } from '@/lib/utils'
import { TabRange, SummaryResponse, SummaryData, NewsItem } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const tab = (req.nextUrl.searchParams.get('tab') || 'today') as TabRange
  const force = req.nextUrl.searchParams.get('force') === '1'
  const cacheKey = `summary:v2:${tab}`

  const cached = await cacheGet<SummaryResponse>(cacheKey)
  // Only serve cache if it has a valid (non-empty, non-error) overview
  const isValidCache = cached &&
    cached.data?.overview &&
    !cached.data.overview.startsWith('AI 分析') &&
    !cached.data.overview.startsWith('目前無法') &&
    !cached.data.overview.startsWith('此時段') &&
    (cached.data.topics?.length ?? 0) > 0
  if (isValidCache && !force) {
    return NextResponse.json({ ...cached, fromCache: true })
  }

  const [twItems, intlItems, social] = await Promise.all([
    getAccumulatedNews('tw', tab, force, true),
    getAccumulatedNews('intl', tab, force, true),
    fetchSocialSignals(),
  ])
  const allItems = [...twItems, ...intlItems]

  // Pre-compute real keyword frequencies and category distribution
  const topKeywords = computeKeywordCounts(allItems.map(i => i.title), 20)
  const categoryCounts = allItems.reduce<Record<string, number>>((acc, item) => {
    const cat = item.column === 'intl' ? 'intl' : (item.category ?? 'other')
    acc[cat] = (acc[cat] ?? 0) + 1
    return acc
  }, {})
  const stats: NewsStats = { topKeywords, categoryCounts, totalCount: allItems.length }

  const data: SummaryData = await generateSummary(allItems, social, stats)

  const response: SummaryResponse = {
    data,
    generatedAt: new Date().toISOString(),
    fromCache: false,
  }

  const isValid = !!(
    data.overview &&
    !data.overview.startsWith('AI 分析') &&
    !data.overview.startsWith('目前無法') &&
    !data.overview.startsWith('此時段') &&
    data.topics.length > 0
  )

  // Only cache successful results (30-min TTL to align with news refresh cycle)
  if (isValid) {
    await cacheSet(cacheKey, response, 1800)
  }
  return NextResponse.json(response)
}
