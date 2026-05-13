import xml2js from 'xml2js'
import { NewsItem, NewsColumn } from '@/types'
import { hashString } from './utils'

interface RSSSource {
  name: string
  url: string
  column: NewsColumn
}

const RSS_SOURCES: RSSSource[] = [
  { name: '中央社', url: 'https://www.cna.com.tw/rss/aall.aspx', column: 'tw' },
  { name: '聯合新聞網', url: 'https://udn.com/rssfeed/news/2/BREAKINGNEWS?ch=news', column: 'tw' },
  { name: '中時電子報', url: 'https://www.chinatimes.com/rss/realtimenews.xml', column: 'tw' },
  { name: '自由時報', url: 'https://feeds.ltn.com.tw/rss/all', column: 'tw' },
  { name: '民視新聞', url: 'https://www.ftvnews.com.tw/rss/news.xml', column: 'tw' },
  { name: 'ETtoday', url: 'https://www.ettoday.net/show_info/rss2.xml', column: 'tw' },
  { name: '風傳媒', url: 'https://www.storm.mg/rss.xml', column: 'tw' },
  { name: 'TVBS', url: 'https://news.tvbs.com.tw/rss', column: 'tw' },
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
]

async function fetchOneFeed(source: RSSSource): Promise<NewsItem[]> {
  try {
    const resp = await fetch(source.url, {
      headers: { 'User-Agent': 'TW-News-Dashboard/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) return []
    const xml = await resp.text()
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
        const title = String(item.title || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
        const url = String(item.link || item.guid || '')
        const pubDate = item.pubDate || item['dc:date'] || new Date().toISOString()
        const rawDesc = String(item.description || '')
        const summary = rawDesc.replace(/<[^>]+>/g, '').replace(/<!\[CDATA\[|\]\]>/g, '').trim() || undefined

        if (!title || !url) return null
        return {
          id: hashString(title + url),
          title,
          url,
          source: source.name,
          publishedAt: new Date(pubDate).toISOString(),
          summary: summary ? summary.slice(0, 200) : undefined,
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
