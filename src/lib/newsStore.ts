import { cacheGet, cacheSet } from './cache'
import { fetchAllRSS } from './rss'
import { fetchNewsAPI } from './newsapi'
import { fetchGDELT, fetchGDELTTaiwan } from './gdelt'
import { fetchMediastack } from './mediastack'
import { fetchGNews } from './gnews'
import { fetchPTTAsNewsItems, fetchDcardAsNewsItems } from './social'
import { filterByDateRange, classifyCategory } from './utils'
import { NewsItem, NewsColumn, TabRange } from '@/types'

const FETCH_INTERVAL_MS = 15 * 60 * 1000   // 15 min: RSS + GDELT
const EXT_INTERVAL_MS   = 24 * 60 * 60 * 1000 // 24 hr: Mediastack + GNews (quota 保護)
const MAX_ITEMS = 2000
const MAX_DAYS  = 7
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
    const [rss, api, gdelt, ext, ptt, dcard] = await Promise.all([
      fetchAllRSS('tw'),
      fetchNewsAPI(),
      fetchGDELTTaiwan(gdeltSpan),
      fetchExternalTW(isBackfill),
      fetchPTTAsNewsItems(),
      fetchDcardAsNewsItems(),
    ])
    return [...rss, ...api, ...gdelt, ...ext, ...ptt, ...dcard]
  } else {
    const [rss, gdelt] = await Promise.all([
      fetchAllRSS('intl'),
      fetchGDELT(gdeltSpan),
    ])
    return [...rss, ...gdelt]
  }
}

// readOnly=true: return cached data as-is, never trigger a fresh fetch.
// Used by hotlist/keywords routes so they don't pile on top of the news fetch.
export async function getAccumulatedNews(
  col: NewsColumn,
  tab: TabRange,
  force = false,
  readOnly = false
): Promise<NewsItem[]> {
  const accKey  = `news:acc:${col}`
  const tsKey   = `news:fetch:${col}`
  const lockKey = `news:lock:${col}`

  const [existing, lastFetchAt] = await Promise.all([
    cacheGet<NewsItem[]>(accKey),
    cacheGet<number>(tsKey),
  ])

  const isBackfill = !existing || existing.length === 0
  const needsFetch = !readOnly && (force || isBackfill || !lastFetchAt || Date.now() - lastFetchAt > FETCH_INTERVAL_MS)
  let items: NewsItem[] = existing ?? []

  if (needsFetch) {
    // Only one concurrent fetch per column
    const isLocked = await cacheGet<boolean>(lockKey)
    if (!isLocked) {
      await cacheSet(lockKey, true, 90) // 90-second lock TTL
      try {
        const fresh = await fetchFresh(col, isBackfill)
        const categorized = fresh.map(item => ({
          ...item,
          category: item.category ?? classifyCategory(item.title, col),
        }))
        const merged = mergeStore(categorized, items)
        // Re-classify the entire store on every refresh so that items cached
        // before keyword rules improved get corrected automatically.
        items = merged.map(item => ({
          ...item,
          category: classifyCategory(item.title, col),
        }))
        await Promise.all([
          cacheSet(accKey, items, TTL),
          cacheSet(tsKey, Date.now(), TTL),
        ])
      } catch {
        // keep existing items on fetch failure
      } finally {
        await cacheSet(lockKey, false, 1)
      }
    }
    // If locked, another fetch is in flight — return stale data immediately
  }

  return filterByDateRange(items, tab)
}
