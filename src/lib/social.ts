import xml2js from 'xml2js'
import { cacheGet, cacheSet } from './cache'
import { hashString } from './utils'
import type { NewsItem } from '@/types'

export interface SocialSignals {
  pttHot: string[]
  dcardHot: string[]
  googleTrends: string[]
}

const SOCIAL_CACHE_KEY = 'social:signals'
const SOCIAL_TTL = 20 * 60

// ── PTT 八卦板 (Atom feed) ────────────────────────────────────────────────────

interface AtomEntry {
  title: string | { _: string }
  link: { $: { href: string } } | string
  updated?: string
  published?: string
}

async function fetchPTTAtom(): Promise<NewsItem[]> {
  try {
    const r = await fetch('https://www.ptt.cc/atom/Gossiping.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/xml, text/xml, */*',
        Cookie: 'over18=1',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) {
      console.warn('[PTT] atom fetch failed:', r.status, r.statusText)
      return []
    }
    const xml = await r.text()
    const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false })
    const entries: AtomEntry[] = parsed?.feed?.entry
    if (!entries) {
      console.warn('[PTT] atom: no entries found')
      return []
    }
    const arr = Array.isArray(entries) ? entries : [entries]
    return arr
      .map(entry => {
        const title = typeof entry.title === 'string'
          ? entry.title
          : (entry.title as { _: string })?._  ?? ''
        const href = typeof entry.link === 'object'
          ? (entry.link as { $: { href: string } }).$?.href ?? ''
          : ''
        const dateStr = entry.updated ?? entry.published ?? ''
        if (!title || !href || title.includes('本文已被刪除')) return null
        return {
          id: hashString('ptt:' + href),
          title,
          url: href.startsWith('http') ? href : `https://www.ptt.cc${href}`,
          source: 'PTT 八卦板',
          publishedAt: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
          column: 'tw' as const,
          category: undefined,
        } as NewsItem
      })
      .filter((x): x is NewsItem => x !== null)
      .slice(0, 20)
  } catch (err) {
    console.warn('[PTT] atom error:', err)
    return []
  }
}

export async function fetchPTTAsNewsItems(): Promise<NewsItem[]> {
  return fetchPTTAtom()
}

async function fetchPTTHot(): Promise<string[]> {
  const items = await fetchPTTAtom()
  return items.map(i => i.title)
}

// ── Dcard 熱門文章 ────────────────────────────────────────────────────────────

interface DcardPost {
  id: number
  title: string
  createdAt: string
  likeCount?: number
  commentCount?: number
  forumAlias?: string
}

const DCARD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://www.dcard.tw/',
  Origin: 'https://www.dcard.tw',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
}

async function fetchDcardRaw(): Promise<DcardPost[]> {
  const url = 'https://www.dcard.tw/service/api/v2/posts?popular=true&limit=30'
  let r: Response
  try {
    r = await fetch(url, { headers: DCARD_HEADERS, signal: AbortSignal.timeout(8000) })
  } catch (err) {
    console.warn('[Dcard] network error:', err)
    return []
  }
  if (!r.ok) {
    console.warn('[Dcard] HTTP error:', r.status, r.statusText)
    return []
  }
  try {
    const data = await r.json()
    if (!Array.isArray(data)) {
      console.warn('[Dcard] unexpected response shape:', typeof data)
      return []
    }
    return data as DcardPost[]
  } catch (err) {
    console.warn('[Dcard] JSON parse error:', err)
    return []
  }
}

export async function fetchDcardAsNewsItems(): Promise<NewsItem[]> {
  const posts = await fetchDcardRaw()
  return posts
    .filter(p => p.title && p.id)
    .slice(0, 20)
    .map(p => ({
      id: hashString('dcard:' + p.id),
      title: p.title,
      url: `https://www.dcard.tw/p/${p.id}`,
      source: 'Dcard',
      publishedAt: p.createdAt ?? new Date().toISOString(),
      column: 'tw' as const,
      category: undefined,
    }))
}

async function fetchDcardHot(): Promise<string[]> {
  const posts = await fetchDcardRaw()
  return posts.filter(p => p.title).slice(0, 20).map(p => p.title)
}

// ── Google Trends 台灣 ────────────────────────────────────────────────────────

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

// ── 主要匯出 ──────────────────────────────────────────────────────────────────

export async function fetchSocialSignals(): Promise<SocialSignals> {
  const cached = await cacheGet<SocialSignals>(SOCIAL_CACHE_KEY)
  if (cached) return cached

  const [ptt, dcard, gtrends] = await Promise.allSettled([
    fetchPTTHot(),
    fetchDcardHot(),
    fetchGoogleTrendsTW(),
  ])

  const signals: SocialSignals = {
    pttHot:       ptt.status     === 'fulfilled' ? ptt.value     : [],
    dcardHot:     dcard.status   === 'fulfilled' ? dcard.value   : [],
    googleTrends: gtrends.status === 'fulfilled' ? gtrends.value : [],
  }

  if (signals.pttHot.length > 0 || signals.dcardHot.length > 0 || signals.googleTrends.length > 0) {
    await cacheSet(SOCIAL_CACHE_KEY, signals, SOCIAL_TTL)
  }

  return signals
}
