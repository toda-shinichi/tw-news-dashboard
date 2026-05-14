import { cacheGet, cacheSet } from './cache'
import { fetchAllRSS } from './rss'
import { fetchNewsAPI } from './newsapi'
import { fetchGDELT, fetchGDELTTaiwan } from './gdelt'
import { fetchMediastack } from './mediastack'
import { fetchGNews } from './gnews'
import { filterByDateRange, classifyCategory } from './utils'
import { NewsItem, NewsColumn, TabRange } from '@/types'

const FETCH_INTERVAL_MS = 15 * 60 * 1000   // 15 min: RSS + GDELT
const EXT_INTERVAL_MS   = 24 * 60 * 60 * 1000 // 24 hr: Mediastack + GNews (quota 保護)
const MAX_ITEMS = 800
const MAX_DAYS  = 30
const TTL = MAX_DAYS * 86_400

function mergeStore(incoming: NewsItem[], existing: NewsItem[]): NewsItem[] {
  const seen   = new Set<string>()
  const cutoff = Date.now() - MAX_DAYS * 86_400_000
  return [...incoming, ...existing]
    .filter(item => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return new Date(item.publishedAt).getTime() > cutoff
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, MAX_ITEMS)
}

// Mediastack + GNews — 每日限額，獨立計時
async function fetchExternalTW(isBackfill: boolean): Promise<NewsItem[]> {
  const extKey  = 'news:ext:tw'
  const lastExt = await cacheGet<number>(extKey)
  const needExt = isBackfill || !lastExt || Date.now() - lastExt > EXT_INTERVAL_MS
  if (!needExt) return []

  const daysBack = isBackfill ? 30 : 1
  const [ms, gn] = await Promise.allSettled([
    fetchMediastack(daysBack),
    fetchGNews(daysBack),
  ])
  await cacheSet(extKey, Date.now(), TTL)
  return [
    ...(ms.status === 'fulfilled' ? ms.value : []),
    ...(gn.status === 'fulfilled' ? gn.value : []),
  ]
}

async function fetchFresh(col: NewsColumn, isBackfill: boolean): Promise<NewsItem[]> {
  const gdeltSpan = isBackfill ? '30d' : '7d'

  if (col === 'tw') {
    const [rss, api, gdelt, ext] = await Promise.all([
      fetchAllRSS('tw'),
      fetchNewsAPI(),
      fetchGDELTTaiwan(gdeltSpan),
      fetchExternalTW(isBackfill),
    ])
    return [...rss, ...api, ...gdelt, ...ext]
  } else {
    const [rss, gdelt] = await Promise.all([
      fetchAllRSS('intl'),
      fetchGDELT(gdeltSpan),
    ])
    return [...rss, ...gdelt]
  }
}

export async function getAccumulatedNews(
  col: NewsColumn,
  tab: TabRange,
  force = false
): Promise<NewsItem[]> {
  const accKey = `news:acc:${col}`
  const tsKey  = `news:fetch:${col}`

  const [existing, lastFetchAt] = await Promise.all([
    cacheGet<NewsItem[]>(accKey),
    cacheGet<number>(tsKey),
  ])

  const isBackfill = !existing || existing.length === 0
  const needsFetch = force || isBackfill || !lastFetchAt || Date.now() - lastFetchAt > FETCH_INTERVAL_MS
  let items: NewsItem[] = existing ?? []

  if (needsFetch) {
    try {
      const fresh = await fetchFresh(col, isBackfill)
      const categorized = fresh.map(item => ({
        ...item,
        category: item.category ?? classifyCategory(item.title, col),
      }))
      items = mergeStore(categorized, items)
      await Promise.all([
        cacheSet(accKey, items, TTL),
        cacheSet(tsKey, Date.now(), TTL),
      ])
    } catch {
      // keep existing items on fetch failure
    }
  }

  return filterByDateRange(items, tab)
}
