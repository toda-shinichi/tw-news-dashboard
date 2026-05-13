import xml2js from 'xml2js'
import { NewsItem, NewsColumn } from '@/types'
import { hashString } from './utils'

interface RSSSource {
  name: string
  url: string
  column: NewsColumn
}

// Google News site: query helper
const gn = (site: string, col: NewsColumn, label: string): RSSSource => ({
  name: label,
  url: `https://news.google.com/rss/search?q=site:${site}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`,
  column: col,
})

const RSS_SOURCES: RSSSource[] = [
  // ── 台灣媒體（直連可用的）────────────────────────
  {
    name: '自由時報',
    url: 'https://news.ltn.com.tw/rss/all.xml',
    column: 'tw',
  },
  {
    name: '聯合新聞網',
    url: 'https://udn.com/rssfeed/news/2/BREAKINGNEWS?ch=news',
    column: 'tw',
  },
  // ── 台灣媒體（Google News site: 查詢）──────────────
  gn('udn.com', 'tw', '聯合新聞網'),
  gn('chinatimes.com', 'tw', '中時電子報'),
  gn('ettoday.net', 'tw', 'ETtoday'),
  gn('tvbs.com.tw', 'tw', 'TVBS'),
  gn('ftvnews.com.tw', 'tw', '民視新聞'),
  gn('storm.mg', 'tw', '風傳媒'),
  gn('cna.com.tw', 'tw', '中央社'),
  gn('setn.com', 'tw', '三立新聞'),
  // ── Google News 主題（台灣）────────────────────────
  {
    name: 'Google News 政治',
    url: 'https://news.google.com/rss/search?q=台灣政治&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
  },
  {
    name: 'Google News 社會',
    url: 'https://news.google.com/rss/search?q=台灣社會&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
  },
  {
    name: 'Google News 財經',
    url: 'https://news.google.com/rss/search?q=台灣財經&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
  },
  // ── 國際視角 ──────────────────────────────────────
  {
    name: 'Google News 國際',
    url: 'https://news.google.com/rss/search?q=Taiwan+international&hl=en-US&gl=US&ceid=US:en',
    column: 'intl',
  },
  {
    name: 'Google News 兩岸',
    url: 'https://news.google.com/rss/search?q=兩岸關係&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'intl',
  },
  {
    name: 'Google News Taiwan',
    url: 'https://news.google.com/rss/search?q=Taiwan&hl=en-US&gl=US&ceid=US:en',
    column: 'intl',
  },
]

async function fetchOneFeed(source: RSSSource): Promise<NewsItem[]> {
  try {
    const resp = await fetch(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TW-News-Dashboard/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) return []
    const xml = await resp.text()
    if (!xml.includes('<item>') && !xml.includes('<item/>')) return []

    const parsed = await xml2js.parseStringPromise(xml, {
      explicitArray: false,
      trim: true,
    })

    const channel = parsed?.rss?.channel
    if (!channel) return []
    const rawItems = channel.item
      ? Array.isArray(channel.item)
        ? channel.item
        : [channel.item]
      : []

    return rawItems
      .map((item: Record<string, string>) => {
        const title = String(item.title || '')
          .replace(/<!\[CDATA\[|\]\]>/g, '')
          .trim()
        const url = String(item.link || item.guid || '')
        if (!title || !url) return null
        const pubDate = item.pubDate || item['dc:date'] || new Date().toISOString()
        const rawDesc = String(item.description || '')
        const summary =
          rawDesc
            .replace(/<[^>]+>/g, '')
            .replace(/<!\[CDATA\[|\]\]>/g, '')
            .trim()
            .slice(0, 200) || undefined

        return {
          id: hashString(title + url),
          title,
          url,
          source: source.name,
          publishedAt: new Date(pubDate).toISOString(),
          summary,
          column: source.column,
        } as NewsItem
      })
      .filter((item: NewsItem | null): item is NewsItem => item !== null)
  } catch {
    return []
  }
}

export async function fetchAllRSS(column?: NewsColumn): Promise<NewsItem[]> {
  const sources = column ? RSS_SOURCES.filter(s => s.column === column) : RSS_SOURCES
  const results = await Promise.allSettled(sources.map(fetchOneFeed))
  return results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
}
