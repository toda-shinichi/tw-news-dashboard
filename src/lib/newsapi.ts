import { NewsItem } from '@/types'
import { hashString } from './utils'

interface NewsAPIArticle {
  title: string
  url: string
  source: { name: string }
  publishedAt: string
  description?: string
}

export async function fetchNewsAPI(): Promise<NewsItem[]> {
  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) return []

  const url = new URL('https://newsapi.org/v2/everything')
  url.searchParams.set('q', 'taiwan OR 台灣')
  url.searchParams.set('sortBy', 'publishedAt')
  url.searchParams.set('pageSize', '30')
  url.searchParams.set('apiKey', apiKey)

  try {
    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!resp.ok) return []
    const data = await resp.json()

    return (data.articles || [])
      .map((a: NewsAPIArticle) => {
        if (!a.title || !a.url || a.title === '[Removed]') return null
        return {
          id: hashString(a.title + a.url),
          title: a.title,
          url: a.url,
          source: a.source?.name || 'NewsAPI',
          publishedAt: a.publishedAt || new Date().toISOString(),
          summary: a.description?.slice(0, 200) || undefined,
          column: 'tw' as const,
        } as NewsItem
      })
      .filter((item: NewsItem | null): item is NewsItem => item !== null)
  } catch {
    return []
  }
}
