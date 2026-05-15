import xml2js from 'xml2js'
import { cacheGet, cacheSet } from './cache'

export interface SocialSignals {
  googleTrends: string[]
}

const SOCIAL_CACHE_KEY = 'social:signals'
const SOCIAL_TTL = 20 * 60

async function fetchGoogleTrendsTW(): Promise<string[]> {
  try {
    const r = await fetch(
      'https://trends.google.com/trending/rss?geo=TW&hours=24',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(7000),
      }
    )
    if (!r.ok) return []
    const xml = await r.text()
    const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false })
    const items = parsed?.rss?.channel?.item
    if (!items) return []
    const arr = Array.isArray(items) ? items : [items]
    return arr
      .slice(0, 20)
      .map((item: { title?: string }) => String(item.title ?? ''))
      .filter(Boolean)
  } catch {
    return []
  }
}

export async function fetchSocialSignals(): Promise<SocialSignals> {
  const cached = await cacheGet<SocialSignals>(SOCIAL_CACHE_KEY)
  if (cached) return cached

  const trends = await fetchGoogleTrendsTW()
  const signals: SocialSignals = { googleTrends: trends }

  if (trends.length > 0) {
    await cacheSet(SOCIAL_CACHE_KEY, signals, SOCIAL_TTL)
  }

  return signals
}
