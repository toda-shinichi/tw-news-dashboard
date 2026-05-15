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

const STORM = (id: number) =>
  `https://www.storm.mg/api/getRss/channel_id/${id}?path=https%3A%2F%2Fwww.storm.mg%2Farticle`

const RSS_SOURCES: RSSSource[] = [
  // ══ 台灣：綜合（無分類，讓 classifier 處理）══════════════
  { name: '自由時報',    url: 'https://news.ltn.com.tw/rss/all.xml',                    column: 'tw' },
  { name: '聯合新聞網',  url: 'https://udn.com/rssfeed/news/2/0?ch=news',               column: 'tw' },
  { name: 'ETtoday',    url: 'https://feeds.feedburner.com/ettoday/realtime',            column: 'tw' },
  { name: '新頭殼',     url: 'https://newtalk.tw/rss/all/',                              column: 'tw' },
  { name: '公視新聞',   url: 'https://about.pts.org.tw/rss/XML/newsfeed.xml',            column: 'tw' },
  { name: '公視電子報', url: 'https://about.pts.org.tw/rss/XML/newsletter.xml',          column: 'tw' },
  // Google News 台灣話題（zh-TW）
  { name: 'GN 台灣話題1', url: 'https://news.google.com/rss/topics/CAAqJQgKIh9DQkFTRVFvSUwyMHZNRFptTXpJU0JYcG9MVlJYS0FBUAE?hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant', column: 'tw' },
  { name: 'GN 台灣話題2', url: 'https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRGx1YlY4U0JYcG9MVlJYR2dKVVZ5Z0FQAQ?hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant', column: 'tw' },
  { name: 'GN 台灣話題3', url: 'https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRGx6TVdZU0JYcG9MVlJYR2dKVVZ5Z0FQAQ?hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant', column: 'tw' },
  { name: 'GN 台灣話題4', url: 'https://news.google.com/rss/topics/CAAqLAgKIiZDQkFTRmdvSkwyMHZNR1ptZHpWbUVnVjZhQzFVVnhvQ1ZGY29BQVAB?hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant', column: 'tw' },
  { name: 'GN 台灣話題5', url: 'https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNREpxYW5RU0JYcG9MVlJYR2dKVVZ5Z0FQAQ?hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant', column: 'tw' },

  // ══ 台灣：政治 ══════════════════════════════════════
  { name: '自由時報政治', url: 'https://news.ltn.com.tw/rss/politics.xml',              column: 'tw', defaultCategory: 'politics' },
  { name: '自由時報評論', url: 'https://news.ltn.com.tw/rss/opinion.xml',               column: 'tw', defaultCategory: 'politics' },
  { name: '自由時報軍武', url: 'https://news.ltn.com.tw/rss/def.xml',                   column: 'tw', defaultCategory: 'politics' },
  { name: '聯合政治',    url: 'https://udn.com/rssfeed/news/2/6638?ch=news',            column: 'tw', defaultCategory: 'politics' },
  { name: '中央社政治',  url: 'https://feeds.feedburner.com/rsscna/politics',           column: 'tw', defaultCategory: 'politics' },
  { name: '新頭殼政治',  url: 'https://newtalk.tw/rss/category/2',                      column: 'tw', defaultCategory: 'politics' },
  { name: '風傳媒政治',  url: STORM(2),                                                  column: 'tw', defaultCategory: 'politics' },
  { name: '風傳媒軍武',  url: STORM(62),                                                 column: 'tw', defaultCategory: 'politics' },
  { name: '風傳媒評論',  url: STORM(109),                                                column: 'tw', defaultCategory: 'politics' },
  gnq('台灣外交 兩岸政策 國防 軍售', 'tw', '政治補充', 'politics'),

  // ══ 台灣：社會 ══════════════════════════════════════
  { name: '自由時報社會', url: 'https://news.ltn.com.tw/rss/society.xml',               column: 'tw', defaultCategory: 'society' },
  { name: '自由時報地方', url: 'https://news.ltn.com.tw/rss/local.xml',                 column: 'tw', defaultCategory: 'society' },
  { name: '聯合社會',    url: 'https://udn.com/rssfeed/news/2/6639?ch=news',            column: 'tw', defaultCategory: 'society' },
  { name: '中央社社會',  url: 'https://feeds.feedburner.com/rsscna/social',             column: 'tw', defaultCategory: 'society' },
  { name: '中央社生活',  url: 'https://feeds.feedburner.com/rsscna/lifehealth',         column: 'tw', defaultCategory: 'society' },
  { name: '中央社地方',  url: 'https://feeds.feedburner.com/rsscna/local',              column: 'tw', defaultCategory: 'society' },
  { name: 'ETtoday 社會', url: 'https://feeds.feedburner.com/ettoday/society',          column: 'tw', defaultCategory: 'society' },
  { name: '新頭殼社會',  url: 'https://newtalk.tw/rss/category/5',                      column: 'tw', defaultCategory: 'society' },
  { name: '風傳媒社會',  url: STORM(11),                                                 column: 'tw', defaultCategory: 'society' },
  gnq('台灣社會案件 意外 災害 食安', 'tw', '社會補充', 'society'),
  gnq('台灣 命案 刑案 逮捕 起訴 嫌犯', 'tw', '刑案補充', 'society'),
  gnq('台灣 車禍 火災 爆炸 搜救 失蹤', 'tw', '事故補充', 'society'),

  // ══ 台灣：民生／財經／科技 ═══════════════════════════
  { name: '自由時報財經', url: 'https://news.ltn.com.tw/rss/business.xml',              column: 'tw', defaultCategory: 'life' },
  { name: '自由時報生活', url: 'https://news.ltn.com.tw/rss/life.xml',                  column: 'tw', defaultCategory: 'life' },
  { name: '自由時報娛樂', url: 'https://news.ltn.com.tw/rss/entertainment.xml',         column: 'tw', defaultCategory: 'life' },
  { name: '聯合財經',    url: 'https://udn.com/rssfeed/news/2/6644?ch=news',            column: 'tw', defaultCategory: 'life' },
  { name: '聯合數位',    url: 'https://udn.com/rssfeed/news/2/7226?ch=news',            column: 'tw', defaultCategory: 'life' },
  { name: '中央社財經',  url: 'https://feeds.feedburner.com/rsscna/finance',            column: 'tw', defaultCategory: 'life' },
  { name: '中央社科技',  url: 'https://feeds.feedburner.com/rsscna/technology',         column: 'tw', defaultCategory: 'life' },
  { name: '中央社文化',  url: 'https://feeds.feedburner.com/rsscna/culture',            column: 'tw', defaultCategory: 'life' },
  { name: '中央社娛樂',  url: 'https://feeds.feedburner.com/rsscna/stars',              column: 'tw', defaultCategory: 'life' },
  { name: '經濟日報',    url: 'https://money.udn.com/rssfeed/news/1001/5588',           column: 'tw', defaultCategory: 'life' },
  { name: 'ETtoday 星光', url: 'https://feeds.feedburner.com/ettoday/star',             column: 'tw', defaultCategory: 'life' },
  { name: 'iThome',     url: 'https://www.ithome.com.tw/rss',                          column: 'tw', defaultCategory: 'life' },
  { name: 'TechNews',   url: 'https://technews.tw/tn-rss/',                            column: 'tw', defaultCategory: 'life' },
  { name: 'Inside',     url: 'https://www.inside.com.tw/feed/rss',                    column: 'tw', defaultCategory: 'life' },
  { name: '新頭殼財經',  url: 'https://newtalk.tw/rss/category/3',                      column: 'tw', defaultCategory: 'life' },
  { name: '新頭殼科技',  url: 'https://newtalk.tw/rss/category/7',                      column: 'tw', defaultCategory: 'life' },
  { name: '新頭殼生活',  url: 'https://newtalk.tw/rss/category/14',                     column: 'tw', defaultCategory: 'life' },
  { name: '新頭殼文化',  url: 'https://newtalk.tw/rss/category/9',                      column: 'tw', defaultCategory: 'life' },
  { name: '新頭殼娛樂',  url: 'https://newtalk.tw/rss/category/18',                     column: 'tw', defaultCategory: 'life' },
  { name: '風傳媒財經',  url: STORM(7),                                                  column: 'tw', defaultCategory: 'life' },
  { name: '風傳媒社會',  url: STORM(9),                                                  column: 'tw', defaultCategory: 'society' },
  { name: '風傳媒生活',  url: STORM(10),                                                 column: 'tw', defaultCategory: 'life' },
  { name: '風傳媒文化',  url: STORM(8),                                                  column: 'tw', defaultCategory: 'life' },
  { name: '風傳媒娛樂',  url: STORM(17),                                                 column: 'tw', defaultCategory: 'life' },
  gnq('台積電 台股 科技 AI 房市', 'tw', '民生補充', 'life'),

  // ══ 國際：中文 ══════════════════════════════════════
  { name: '自由時報國際', url: 'https://news.ltn.com.tw/rss/world.xml',                 column: 'intl', defaultCategory: 'politics' },
  { name: '聯合全球',    url: 'https://udn.com/rssfeed/news/2/7225?ch=news',            column: 'intl', defaultCategory: 'politics' },
  { name: '中央社國際',  url: 'https://feeds.feedburner.com/rsscna/intworld',           column: 'intl', defaultCategory: 'politics' },
  { name: '中央社兩岸',  url: 'https://feeds.feedburner.com/rsscna/mainland',           column: 'intl', defaultCategory: 'politics' },
  { name: '新頭殼國際',  url: 'https://newtalk.tw/rss/category/1',                      column: 'intl', defaultCategory: 'politics' },
  { name: '風傳媒國際',  url: STORM(4),                                                  column: 'intl', defaultCategory: 'politics' },

  // ══ 國際：英文 ══════════════════════════════════════
  { name: 'BBC World',   url: 'http://feeds.bbci.co.uk/news/world/rss.xml',            column: 'intl' },
  { name: 'CNN Top',     url: 'http://rss.cnn.com/rss/edition.rss',                    column: 'intl' },
  { name: 'NY Times',    url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', column: 'intl' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss',                column: 'intl' },
  { name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', column: 'intl', defaultCategory: 'life' },
  { name: 'Bloomberg',   url: 'https://feeds.bloomberg.com/technology/news.rss',       column: 'intl', defaultCategory: 'life' },

  // ══ 國際：Google News ══════════════════════════════
  gnq('Taiwan politics diplomacy security', 'intl', 'Taiwan', undefined, 'en-US', 'US', 'US:en'),
  gnq('Taiwan China military strait conflict', 'intl', '台海安全', undefined, 'en-US', 'US', 'US:en'),
  gnq('US China trade tariff sanctions economy', 'intl', '美中貿易', undefined, 'en-US', 'US', 'US:en'),
  gnq('Ukraine Russia war Middle East crisis', 'intl', '國際衝突', undefined, 'en-US', 'US', 'US:en'),
  gnq('兩岸關係 台海局勢 中共 解放軍', 'intl', '兩岸'),
  gnq('川普 習近平 美中關係 貿易戰 關稅', 'intl', '川習美中', 'politics'),
  gnq('俄烏戰爭 以巴衝突 中東局勢 國際局勢', 'intl', '國際衝突中文', 'politics'),
  gnq('南海 印太 美日韓 北約 峰會', 'intl', '印太安全', 'politics'),
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

        const d = new Date(pubDate)
        const publishedAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
        return {
          id: hashString(title + url),
          title,
          url,
          source: source.name,
          publishedAt,
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
