import { NextRequest, NextResponse } from 'next/server'
import { extractHotList, HotList } from '@/lib/ai'
import { cacheGet, cacheSet } from '@/lib/cache'
import { dedupeByTitle } from '@/lib/utils'
import { getAccumulatedNews } from '@/lib/newsStore'
import { TabRange } from '@/types'

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

  const [twItems, intlItems] = await Promise.all([
    getAccumulatedNews('tw', tab, force, true),
    getAccumulatedNews('intl', tab, force, true),
  ])

  const [twHot, intlHot] = await Promise.all([
    extractHotList(dedupeByTitle(twItems).map(i => i.title), 'zh'),
    extractHotList(dedupeByTitle(intlItems).map(i => i.title), 'en'),
  ])

  const response: HotListResponse = { tw: twHot, intl: intlHot, fromCache: false }
  await cacheSet(cacheKey, response)
  return NextResponse.json(response)
}
