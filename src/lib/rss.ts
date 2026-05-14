import xml2js from 'xml2js'
import { NewsItem, NewsColumn, NewsCategory } from '@/types'
import { hashString } from './utils'

interface RSSSource {
  name: string
  url: string
  column: NewsColumn
  defaultCategory?: Exclude<NewsCategory, 'all'>
}

// Google News topic search helper
const gnq = (
  q: string,
  col: NewsColumn,
  label: string,
  cat?: Exclude<NewsCategory, 'all'>,
  lang = 'zh-TW',
  gl = 'TW',
  ceid = 'TW:zh-Hant'
): RSSSource => ({
  name: `Google News ${label}`,
  url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${lang}&gl=${gl}&ceid=${ceid}`,
  column: col,
  defaultCategory: cat,
})

const RSS_SOURCES: RSSSource[] = [
  // ── 台灣直連（8 源）─────────────────────────────────
  { name: '自由時報', url: 'https://news.ltn.com.tw/rss/all.xml',                  column: 'tw' },
  { name: '公視新聞', url: 'https://about.pts.org.tw/rss/XML/newsfeed.xml',         column: 'tw' },
  { name: '報導者',   url: 'https://public.twreporter.org/rss/twreporter-rss.xml', column: 'tw' },
  { name: '聯合新聞網', url: 'https://udn.com/rssfeed/news/2/0?ch=news',            column: 'tw' },
  { name: '中時電子報', url: 'https://www.chinatimes.com/rss/realtime.xml',         column: 'tw' },
  { name: 'TVBS',    url: 'https://news.tvbs.com.tw/rss/news',                      column: 'tw' },
  { name: 'ETtoday', url: 'https://feeds.feedburner.com/ettoday/realtime',          column: 'tw' },
  { name: '三立新聞', url: 'https://www.setn.com/rss.ashx',                         column: 'tw' },

  // ── 台灣 Google News 政治（3 條，各攻不同角度）────────
  gnq('台灣政治 立法院 行政院 賴清德 施政', 'tw', '政治-機構', 'politics'),
  gnq('選舉 罷免 補選 政黨 民調 朝野協商', 'tw', '政治-選舉', 'politics'),
  gnq('台灣外交 國防政策 兩岸關係 軍售', 'tw', '政治-外交', 'politics'),

  // ── 台灣 Google News 社會（3 條）────────────────────
  gnq('台灣治安 司法 詐騙 犯罪 刑事', 'tw', '社會-治安', 'society'),
  gnq('台灣火災 地震 事故 意外 搜救', 'tw', '社會-災害', 'society'),
  gnq('台灣環保 環境污染 食安 校園 社會', 'tw', '社會-環境', 'society'),

  // ── 台灣 Google News 民生（3 條）────────────────────
  gnq('台積電 半導體 AI 科技 鴻海', 'tw', '科技民生', 'life'),
  gnq('台股 財經 房市 物價 通膨', 'tw', '財經民生', 'life'),
  gnq('醫療 食品 教育 交通 民生 消費', 'tw', '生活民生', 'life'),

  // ── 國際 Google News（5 條）─────────────────────────
  gnq('Taiwan politics diplomacy security', 'intl', 'Taiwan', undefined, 'en-US', 'US', 'US:en'),
  gnq('Taiwan China military strait conflict', 'intl', '台海安全', undefined, 'en-US', 'US', 'US:en'),
  gnq('US China trade tariff sanctions economy', 'intl', '美中貿易', undefined, 'en-US', 'US', 'US:en'),
  gnq('Ukraine Russia war Middle East crisis', 'intl', '國際衝突', undefined, 'en-US', 'US', 'US:en'),
  gnq('兩岸關係 台海局勢 中共 解放軍', 'intl', '兩岸'),
]

function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Strip trailing " - Source Name" appended by aggregators/GN feeds
function cleanTitle(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/\s*[-–—]\s*[^\-–—]{2,50}(網|報|社|台|通訊|頻道|媒體)$/u, '')
    .trim()
}

async function fetchOneFeed(source: RSSSource): Promise<NewsItem[]> {
  try {
    const resp = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(5000),
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
        const title = cleanTitle(String(item.title || ''))
        const url = String(item.link || item.guid || '')
        if (!title || !url) return null
        const pubDate = item.pubDate || item['dc:date'] || new Date().toISOString()
        const rawDesc = String(item.description || '')
        const summary =
          decodeEntities(
            rawDesc
              .replace(/<[^>]+>/g, '')
              .replace(/<!\[CDATA\[|\]\]>/g, '')
          ).slice(0, 200) || undefined

        return {
          id: hashString(title + url),
          title,
          url,
          source: source.name,
          publishedAt: new Date(pubDate).toISOString(),
          summary,
          column: source.column,
          category: source.defaultCategory,
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
