import { cacheGet, cacheSet } from './cache'
import { fetchAllRSS } from './rss'
import { fetchNewsAPI } from './newsapi'
import { fetchGDELT } from './gdelt'
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

  const needsFetch = force || !lastFetchAt || Date.now() - lastFetchAt > FETCH_INTERVAL_MS
  let items: NewsItem[] = existing ?? []

  if (needsFetch) {
    try {
      let fresh: NewsItem[] = []
      if (col === 'tw') {
        const [rss, api] = await Promise.all([fetchAllRSS('tw'), fetchNewsAPI()])
        fresh = [...rss, ...api]
      } else {
        const [rss, gdelt] = await Promise.all([
          fetchAllRSS('intl'),
          fetchGDELT('7d'),
        ])
        fresh = [...rss, ...gdelt]
      }

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
