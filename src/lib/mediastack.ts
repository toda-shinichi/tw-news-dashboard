import { NewsItem } from '@/types'
import { hashString } from './utils'

interface MediastackArticle {
  title: string
  description: string | null
  url: string
  source: string
  published_at: string
}

export async function fetchMediastack(daysBack = 1): Promise<NewsItem[]> {
  const apiKey = process.env.MEDIASTACK_API_KEY
  if (!apiKey) return []

  const to = new Date()
  const from = new Date(Date.now() - daysBack * 86_400_000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const url = new URL('http://api.mediastack.com/v1/news')
  url.searchParams.set('access_key', apiKey)
  url.searchParams.set('languages', 'zh')
  url.searchParams.set('countries', 'tw')
  url.searchParams.set('limit', '100')
  url.searchParams.set('date', `${fmt(from)},${fmt(to)}`)
  url.searchParams.set('sort', 'published_desc')

  try {
    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) })
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.data || [])
      .map((a: MediastackArticle) => {
        if (!a.title || !a.url) return null
        return {
          id: hashString(a.title + a.url),
          title: a.title,
          url: a.url,
          source: a.source || 'Mediastack',
          publishedAt: new Date(a.published_at).toISOString(),
          summary: a.description?.slice(0, 200) || undefined,
          column: 'tw' as const,
        } as NewsItem
      })
      .filter((item: NewsItem | null): item is NewsItem => item !== null)
  } catch {
    return []
  }
}
