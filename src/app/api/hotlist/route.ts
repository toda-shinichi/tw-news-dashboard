import { NextRequest, NextResponse } from 'next/server'
import { extractHotList, HotList } from '@/lib/ai'
import { cacheGet, cacheSet } from '@/lib/cache'
import { dedupeByTitle, computeHotKeywords } from '@/lib/utils'
import { getAccumulatedNews } from '@/lib/newsStore'
import { saveSnapshot } from '@/lib/history'
import { NewsItem, TabRange, SummaryData } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

interface HotListResponse {
  tw: HotList
  intl: HotList
  fromCache: boolean
}

const LIFE_CATS = new Set(['life', 'entertainment', 'finance', 'tech'])

function filterByCat(items: NewsItem[], cat: string) {
  return items.filter(i =>
    cat === 'life' ? LIFE_CATS.has(i.category ?? '') : i.category === cat
  )
}

const isSocialPost = (i: NewsItem) => i.source === 'PTT 八卦板' || i.source === 'Dcard'

export async function GET(req: NextRequest) {
  const tab   = (req.nextUrl.searchParams.get('tab') || 'today') as TabRange
  const cat   = req.nextUrl.searchParams.get('cat') || ''
  const force = req.nextUrl.searchParams.get('force') === '1'
  const cacheKey = cat ? `hotlist:${tab}:${cat}` : `hotlist:${tab}`

  const cached = await cacheGet<HotListResponse>(cacheKey)
  if (cached && !force) {
    return NextResponse.json({ ...cached, fromCache: true })
  }

  const [twItems, intlItems] = await Promise.all([
    getAccumulatedNews('tw', tab, force, true),
    getAccumulatedNews('intl', tab, force, true),
  ])

  const twDeduped   = dedupeByTitle(twItems)
  const intlDeduped = dedupeByTitle(intlItems)

  // Category isolation rules:
  // - social:   PTT/Dcard only — skip AI, return ranked titles directly
  // - intl:     only column=intl articles
  // - society / life: only domestic tw column, preventing intl/politics bleed
  // - politics: tw politics + intl politics (both domestic and cross-strait)
  // - all:      all tw articles (default)
  let twHot: HotList
  let lang: 'zh' | 'en' = 'zh'

  if (cat === 'social') {
    const socialItems = twDeduped.filter(isSocialPost)
    const titles = socialItems.map(i => i.title)
    twHot = {
      topics:   titles.slice(0, 5),
      keywords: computeHotKeywords(titles, 5),
      people:   [],
    }
  } else {
    let feedForAI: NewsItem[]
    if (cat === 'intl') {
      feedForAI = dedupeByTitle([...twItems, ...intlItems]).filter(i => i.column === 'intl' && !isSocialPost(i))
      lang = 'en'
    } else if (cat === 'society' || cat === 'life') {
      feedForAI = filterByCat(twDeduped, cat).filter(i => !isSocialPost(i))
    } else if (cat === 'politics') {
      feedForAI = [
        ...filterByCat(twDeduped, 'politics').filter(i => !isSocialPost(i)),
        ...filterByCat(intlDeduped, 'politics'),
      ]
    } else {
      feedForAI = twDeduped
    }
    twHot = await extractHotList(feedForAI.map(i => i.title), lang)
  }

  const intlHot: HotList = { topics: [], keywords: [], people: [] }

  const response: HotListResponse = { tw: twHot, intl: intlHot, fromCache: false }
  // Only cache if we got meaningful results — prevents caching empty "no data" AI responses
  if (twHot.topics.length > 0 || twHot.keywords.length > 0) {
    await cacheSet(cacheKey, response, 1200)
  }

  // Save a history snapshot (combines hotlist with the current cached summary)
  const summaryCache = await cacheGet<{ data: SummaryData; generatedAt: string }>(`summary:v2:${tab}`)
  if (summaryCache?.data?.overview) {
    await saveSnapshot({
      generatedAt: new Date().toISOString(),
      tab,
      summary: summaryCache.data,
      hotlist: { tw: twHot, intl: intlHot },
    })
  }

  return NextResponse.json(response)
}
