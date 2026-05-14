import { cacheGet, cacheSet } from './cache'
import { fetchAllRSS } from './rss'
import { fetchNewsAPI } from './newsapi'
import { fetchGDELT, fetchGDELTTaiwan } from './gdelt'
import { filterByDateRange, classifyCategory } from './utils'
import { NewsItem, NewsColumn, TabRange } from '@/types'

const FETCH_INTERVAL_MS = 30 * 60 * 1000
const MAX_ITEMS = 800
const MAX_DAYS = 30
const TTL = MAX_DAYS * 86_400

function mergeStore(incoming: NewsItem[], existing: NewsItem[]): NewsItem[] {
  const seen = new Set<string>()
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

async function fetchFresh(col: NewsColumn, isBackfill: boolean): Promise<NewsItem[]> {
  // On first run (empty store), pull 30 days of history from GDELT so time tabs work immediately.
  // Subsequent fetches only pull the latest day.
  const gdeltSpan = isBackfill ? '30d' : '7d'

  if (col === 'tw') {
    const [rss, api, gdelt] = await Promise.all([
      fetchAllRSS('tw'),
      fetchNewsAPI(),
      // GDELT indexes many TW Chinese-language sources — gives instant historical depth
      fetchGDELTTaiwan(gdeltSpan),
    ])
    return [...rss, ...api, ...gdelt]
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
  const tsKey = `news:fetch:${col}`

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
