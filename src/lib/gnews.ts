import { NewsItem } from '@/types'
import { hashString, isChineseText } from './utils'

interface GNewsArticle {
  title: string
  description: string | null
  url: string
  publishedAt: string
  source: { name: string }
}

export async function fetchGNews(daysBack = 1): Promise<NewsItem[]> {
  const apiKey = process.env.GNEWS_API_KEY
  if (!apiKey) return []

  const from = new Date(Date.now() - daysBack * 86_400_000).toISOString()

  const url = new URL('https://gnews.io/api/v4/search')
  url.searchParams.set('q', '台灣')
  url.searchParams.set('lang', 'zh')
  url.searchParams.set('country', 'tw')
  url.searchParams.set('max', '10') // free plan: 10 per request
  url.searchParams.set('from', from)
  url.searchParams.set('sortby', 'publishedAt')
  url.searchParams.set('apikey', apiKey)

  try {
    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.articles || [])
      .map((a: GNewsArticle) => {
        if (!a.title || !a.url) return null
        return {
          id: hashString(a.title + a.url),
          title: a.title,
          url: a.url,
          source: a.source?.name || 'GNews',
          publishedAt: new Date(a.publishedAt).toISOString(),
          summary: a.description?.slice(0, 200) || undefined,
          column: 'tw' as const,
        } as NewsItem
      })
      .filter((item: NewsItem | null): item is NewsItem => item !== null && isChineseText(item.title))
  } catch {
    return []
  }
}
