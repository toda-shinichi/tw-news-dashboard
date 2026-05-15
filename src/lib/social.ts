import xml2js from 'xml2js'
import { cacheGet, cacheSet } from './cache'
import { hashString } from './utils'
import type { NewsItem } from '@/types'

export interface SocialSignals {
  pttHot: string[]      // PTT 八卦板熱門標題（推文數排序）
  dcardHot: string[]    // Dcard 熱門文章標題
  googleTrends: string[] // Google Trends 台灣熱搜關鍵字
}

const SOCIAL_CACHE_KEY = 'social:signals'
const SOCIAL_TTL = 20 * 60 // 20 分鐘

interface PTTArticle {
  href: string
  title: string
  nrec: string
  date: string   // format: "M/DD"
  author?: string
}

interface DcardPost {
  id: number
  title: string
  createdAt: string
  likeCount?: number
  commentCount?: number
  forumAlias?: string
}

// ── PTT 八卦板 ────────────────────────────────────────────────────────────────

const PTT_HEADERS = {
  Cookie: 'over18=1',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
}

function parsePTTDate(dateStr: string): string {
  // "5/14" → today's year, Taiwan time
  const now = new Date()
  const [m, d] = dateStr.trim().split('/').map(Number)
  if (!m || !d) return now.toISOString()
  const year = now.getMonth() + 1 < m ? now.getFullYear() - 1 : now.getFullYear()
  // Use noon Taiwan time (UTC+8) → 04:00 UTC
  return new Date(Date.UTC(year, m - 1, d, 4, 0, 0)).toISOString()
}

const PTT_SCORE = (nrec: string) => {
  if (nrec === '爆') return 100
  const n = parseInt(nrec)
  return isNaN(n) ? 0 : Math.max(0, n)
}

async function fetchPTTRaw(): Promise<PTTArticle[]> {
  const r1 = await fetch('https://www.ptt.cc/bbs/Gossiping/index.json', {
    headers: PTT_HEADERS,
    signal: AbortSignal.timeout(7000),
  })
  if (!r1.ok) return []

  const d1 = await r1.json()
  let articles: PTTArticle[] = d1.articles ?? []

  const prevPath = d1.previous_page as string | undefined
  if (prevPath) {
    const prevJson = prevPath.replace('.html', '.json')
    const r2 = await fetch(`https://www.ptt.cc${prevJson}`, {
      headers: PTT_HEADERS,
      signal: AbortSignal.timeout(5000),
    }).catch(() => null)
    if (r2?.ok) {
      const d2 = await r2.json()
      articles = [...articles, ...(d2.articles ?? [])]
    }
  }

  return articles.filter(
    a => a.title && !a.title.includes('本文已被刪除') && !a.title.includes('(已被刪除)')
  )
}

async function fetchPTTHot(): Promise<string[]> {
  try {
    const articles = await fetchPTTRaw()
    return articles
      .sort((a, b) => PTT_SCORE(b.nrec) - PTT_SCORE(a.nrec))
      .slice(0, 15)
      .map(a => a.title)
  } catch {
    return []
  }
}

export async function fetchPTTAsNewsItems(): Promise<NewsItem[]> {
  try {
    const articles = await fetchPTTRaw()
    return articles
      .sort((a, b) => PTT_SCORE(b.nrec) - PTT_SCORE(a.nrec))
      .slice(0, 20)
      .map(a => ({
        id: hashString('ptt:' + a.href),
        title: a.title,
        url: `https://www.ptt.cc${a.href}`,
        source: 'PTT 八卦板',
        publishedAt: parsePTTDate(a.date),
        column: 'tw' as const,
        category: undefined,
      }))
  } catch {
    return []
  }
}

// ── Dcard 熱門文章 ────────────────────────────────────────────────────────────

const DCARD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://www.dcard.tw/',
  Accept: 'application/json',
}

async function fetchDcardRaw(): Promise<DcardPost[]> {
  const r = await fetch(
    'https://www.dcard.tw/service/api/v2/posts?popular=true&limit=30',
    { headers: DCARD_HEADERS, signal: AbortSignal.timeout(7000) }
  )
  if (!r.ok) return []
  return (await r.json()) as DcardPost[]
}

async function fetchDcardHot(): Promise<string[]> {
  try {
    const posts = await fetchDcardRaw()
    return posts.filter(p => p.title).slice(0, 20).map(p => p.title)
  } catch {
    return []
  }
}

export async function fetchDcardAsNewsItems(): Promise<NewsItem[]> {
  try {
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
  } catch {
    return []
  }
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
    pttHot:       ptt.status       === 'fulfilled' ? ptt.value       : [],
    dcardHot:     dcard.status     === 'fulfilled' ? dcard.value     : [],
    googleTrends: gtrends.status   === 'fulfilled' ? gtrends.value   : [],
  }

  if (signals.pttHot.length > 0 || signals.googleTrends.length > 0) {
    await cacheSet(SOCIAL_CACHE_KEY, signals, SOCIAL_TTL)
  }

  return signals
}
