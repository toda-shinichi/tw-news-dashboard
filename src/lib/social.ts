import xml2js from 'xml2js'
import { cacheGet, cacheSet } from './cache'

export interface SocialSignals {
  pttHot: string[]      // PTT 八卦板熱門標題（推文數排序）
  dcardHot: string[]    // Dcard 熱門文章標題
  googleTrends: string[] // Google Trends 台灣熱搜關鍵字
}

const SOCIAL_CACHE_KEY = 'social:signals'
const SOCIAL_TTL = 20 * 60 // 20 分鐘

// ── PTT 八卦板 ────────────────────────────────────────────────────────────────

async function fetchPTTHot(): Promise<string[]> {
  try {
    const headers = {
      Cookie: 'over18=1',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    }

    // 抓當頁 + 上一頁，取得更多樣本
    const r1 = await fetch('https://www.ptt.cc/bbs/Gossiping/index.json', {
      headers,
      signal: AbortSignal.timeout(7000),
    })
    if (!r1.ok) return []

    const d1 = await r1.json()
    let articles: unknown[] = d1.articles ?? []

    const prevPath = d1.previous_page as string | undefined
    if (prevPath) {
      const prevJson = prevPath.replace('.html', '.json')
      const r2 = await fetch(`https://www.ptt.cc${prevJson}`, {
        headers,
        signal: AbortSignal.timeout(5000),
      })
      if (r2.ok) {
        const d2 = await r2.json()
        articles = [...articles, ...(d2.articles ?? [])]
      }
    }

    const toScore = (nrec: string) => {
      if (nrec === '爆') return 100
      const n = parseInt(nrec)
      return isNaN(n) ? 0 : Math.max(0, n)
    }

    return (articles as Array<{ title?: string; nrec?: string }>)
      .filter(a => a.title && !a.title.includes('本文已被刪除') && !a.title.includes('(已被刪除)'))
      .sort((a, b) => toScore(b.nrec ?? '0') - toScore(a.nrec ?? '0'))
      .slice(0, 15)
      .map(a => String(a.title))
  } catch {
    return []
  }
}

// ── Dcard 熱門文章 ────────────────────────────────────────────────────────────

async function fetchDcardHot(): Promise<string[]> {
  try {
    const r = await fetch(
      'https://www.dcard.tw/service/api/v2/posts?popular=true&limit=30',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://www.dcard.tw/',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(7000),
      }
    )
    if (!r.ok) return []
    const posts = (await r.json()) as Array<{ title?: string }>
    return posts
      .filter(p => p.title)
      .slice(0, 20)
      .map(p => String(p.title))
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
