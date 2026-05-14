import { NewsItem } from '@/types'
import { hashString } from './utils'

interface GDELTArticle {
  url: string
  title: string
  seendate: string
  domain: string
}

function parseGDELTDate(raw: string): string {
  // Format: "20240115T120000Z"
  if (!raw) return new Date().toISOString()
  try {
    const s = raw.replace(/[TZ]/g, '')
    const y = s.slice(0, 4)
    const mo = s.slice(4, 6)
    const d = s.slice(6, 8)
    const h = s.slice(8, 10) || '00'
    const mi = s.slice(10, 12) || '00'
    const se = s.slice(12, 14) || '00'
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}Z`).toISOString()
  } catch {
    return new Date().toISOString()
  }
}

export function getGDELTTimespan(tab: string): string {
  switch (tab) {
    case '3days': return '3d'
    case 'week': return '7d'
    case 'month': return '30d'
    default: return '1d'
  }
}

async function gdeltFetch(query: string, timespan: string, column: 'tw' | 'intl', maxrecords = 50): Promise<NewsItem[]> {
  const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc')
  url.searchParams.set('query', query)
  url.searchParams.set('mode', 'artlist')
  url.searchParams.set('maxrecords', String(maxrecords))
  url.searchParams.set('format', 'json')
  url.searchParams.set('timespan', timespan)
  url.searchParams.set('sort', 'hybridrel')

  try {
    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) })
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.articles || [])
      .map((a: GDELTArticle) => {
        if (!a.title || !a.url) return null
        return {
          id: hashString(a.title + a.url),
          title: a.title,
          url: a.url,
          source: a.domain || 'GDELT',
          publishedAt: parseGDELTDate(a.seendate),
          column,
        } as NewsItem
      })
      .filter((item: NewsItem | null): item is NewsItem => item !== null)
  } catch {
    return []
  }
}

export async function fetchGDELT(timespan = '1d'): Promise<NewsItem[]> {
  return gdeltFetch('Taiwan sourcelang:english', timespan, 'intl', 50)
}

// GDELT also indexes many Traditional Chinese Taiwanese news sources
export async function fetchGDELTTaiwan(timespan = '1d'): Promise<NewsItem[]> {
  return gdeltFetch('台灣 OR Taiwan sourcecountry:TW', timespan, 'tw', 50)
}
