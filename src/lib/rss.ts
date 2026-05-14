import xml2js from 'xml2js'
import { NewsItem, NewsColumn, NewsCategory } from '@/types'
import { hashString } from './utils'

interface RSSSource {
  name: string
  url: string
  column: NewsColumn
  defaultCategory?: Exclude<NewsCategory, 'all'>
}

// Google News site: query helper
const gn = (
  site: string,
  col: NewsColumn,
  label: string,
  cat?: Exclude<NewsCategory, 'all'>
): RSSSource => ({
  name: label,
  url: `https://news.google.com/rss/search?q=site:${site}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`,
  column: col,
  defaultCategory: cat,
})

// CNA feedburner helper
const cna = (
  path: string,
  label: string,
  cat: Exclude<NewsCategory, 'all'>,
  col: NewsColumn = 'tw'
): RSSSource => ({
  name: `中央社 ${label}`,
  url: `https://feeds.feedburner.com/rsscna/${path}`,
  column: col,
  defaultCategory: cat,
})

// LTN category helper
const ltn = (
  path: string,
  label: string,
  cat: Exclude<NewsCategory, 'all'>,
  col: NewsColumn = 'tw'
): RSSSource => ({
  name: `自由時報 ${label}`,
  url: `https://news.ltn.com.tw/rss/${path}.xml`,
  column: col,
  defaultCategory: cat,
})

const RSS_SOURCES: RSSSource[] = [
  // ── 自由時報（直連，分類 feed）────────────────────
  { name: '自由時報', url: 'https://news.ltn.com.tw/rss/all.xml', column: 'tw' },
  ltn('politics', '政治', 'politics'),
  ltn('society', '社會', 'society'),
  ltn('life', '生活', 'life'),
  ltn('business', '財經', 'finance'),
  ltn('entertainment', '娛樂', 'entertainment'),
  ltn('def', '軍武', 'politics'),
  ltn('world', '國際', 'politics', 'intl'),

  // ── 中央社（feedburner 直連，分類 feed）──────────
  cna('politics', '政治', 'politics'),
  cna('mainland', '兩岸', 'politics'),
  cna('finance', '產經', 'finance'),
  cna('technology', '科技', 'tech'),
  cna('lifehealth', '生活', 'life'),
  cna('social', '社會', 'society'),
  cna('local', '地方', 'society'),
  cna('culture', '文化', 'entertainment'),
  cna('stars', '娛樂', 'entertainment'),
  cna('intworld', '國際', 'politics', 'intl'),

  // ── 其他台灣媒體（直連）──────────────────────────
  { name: '公視新聞', url: 'https://about.pts.org.tw/rss/XML/newsfeed.xml', column: 'tw' },
  { name: '風傳媒', url: 'https://www.storm.mg/feed', column: 'tw' },
  { name: '報導者', url: 'https://public.twreporter.org/rss/twreporter-rss.xml', column: 'tw' },
  { name: '關鍵評論網', url: 'https://feeds.feedburner.com/TheNewsLens', column: 'tw' },
  { name: 'Peopo 公民新聞', url: 'https://www.peopo.org/peopo_agg/feed?post_u=1381', column: 'tw' },

  // ── Google News site: 查詢（補充來源）────────────
  gn('udn.com', 'tw', '聯合新聞網'),
  gn('chinatimes.com', 'tw', '中時電子報'),
  gn('ettoday.net', 'tw', 'ETtoday'),
  gn('tvbs.com.tw', 'tw', 'TVBS'),
  gn('ftvnews.com.tw', 'tw', '民視新聞'),
  gn('setn.com', 'tw', '三立新聞'),

  // ── Google News 主題（台灣）──────────────────────
  {
    name: 'Google News 政治',
    url: 'https://news.google.com/rss/search?q=台灣政治+立法院&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'politics',
  },
  {
    name: 'Google News 外交',
    url: 'https://news.google.com/rss/search?q=台灣外交+美台關係+邦交&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'politics',
  },
  {
    name: 'Google News 國防',
    url: 'https://news.google.com/rss/search?q=台灣國防+軍事+軍購&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'politics',
  },
  {
    name: 'Google News 選舉',
    url: 'https://news.google.com/rss/search?q=台灣選舉+民調+政黨&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'politics',
  },
  {
    name: 'Google News 社會',
    url: 'https://news.google.com/rss/search?q=台灣社會+治安+事故&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'society',
  },
  {
    name: 'Google News 司法',
    url: 'https://news.google.com/rss/search?q=台灣司法+法院+判決&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'society',
  },
  {
    name: 'Google News 環境',
    url: 'https://news.google.com/rss/search?q=台灣環境+氣候+空污&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'society',
  },
  {
    name: 'Google News 財經',
    url: 'https://news.google.com/rss/search?q=台灣財經+景氣+台股&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'finance',
  },
  {
    name: 'Google News 房市',
    url: 'https://news.google.com/rss/search?q=台灣房市+房價+租金&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'finance',
  },
  {
    name: 'Google News 半導體',
    url: 'https://news.google.com/rss/search?q=台積電+半導體+晶片&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'tech',
  },
  {
    name: 'Google News 科技',
    url: 'https://news.google.com/rss/search?q=台灣科技+AI+新創&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'tech',
  },
  {
    name: 'Google News 民生',
    url: 'https://news.google.com/rss/search?q=台灣物價+通膨+民生&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'life',
  },
  {
    name: 'Google News 醫療',
    url: 'https://news.google.com/rss/search?q=台灣醫療+健康+食安&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'life',
  },
  {
    name: 'Google News 娛樂',
    url: 'https://news.google.com/rss/search?q=台灣娛樂+藝人+電影&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'entertainment',
  },
  {
    name: 'Google News 體育',
    url: 'https://news.google.com/rss/search?q=台灣體育+運動+賽事&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'tw',
    defaultCategory: 'society',
  },

  // ── 國際視角 ─────────────────────────────────────
  {
    name: 'Google News Taiwan',
    url: 'https://news.google.com/rss/search?q=Taiwan&hl=en-US&gl=US&ceid=US:en',
    column: 'intl',
  },
  {
    name: 'Google News 國際',
    url: 'https://news.google.com/rss/search?q=Taiwan+international+news&hl=en-US&gl=US&ceid=US:en',
    column: 'intl',
  },
  {
    name: 'Google News 兩岸',
    url: 'https://news.google.com/rss/search?q=兩岸關係+台海&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    column: 'intl',
  },
  {
    name: 'Google News 台海安全',
    url: 'https://news.google.com/rss/search?q=Taiwan+China+military+strait&hl=en-US&gl=US&ceid=US:en',
    column: 'intl',
  },
  {
    name: 'Google News 美中貿易',
    url: 'https://news.google.com/rss/search?q=US+China+trade+tariff&hl=en-US&gl=US&ceid=US:en',
    column: 'intl',
  },
  {
    name: 'Google News 俄烏',
    url: 'https://news.google.com/rss/search?q=Ukraine+Russia+war&hl=en-US&gl=US&ceid=US:en',
    column: 'intl',
  },
  {
    name: 'Google News 中東',
    url: 'https://news.google.com/rss/search?q=Middle+East+Israel+Gaza&hl=en-US&gl=US&ceid=US:en',
    column: 'intl',
  },
  {
    name: 'Google News 亞太',
    url: 'https://news.google.com/rss/search?q=Japan+Korea+Asia+Pacific&hl=en-US&gl=US&ceid=US:en',
    column: 'intl',
  },
  {
    name: 'Google News 全球經濟',
    url: 'https://news.google.com/rss/search?q=global+economy+inflation+Fed&hl=en-US&gl=US&ceid=US:en',
    column: 'intl',
  },
  {
    name: 'Google News 中國',
    url: 'https://news.google.com/rss/search?q=China+Xi+Jinping&hl=en-US&gl=US&ceid=US:en',
    column: 'intl',
  },
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
