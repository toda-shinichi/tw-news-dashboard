export type SentimentLabel = 'positive' | 'negative' | 'neutral'
export type TabRange = 'today' | '3days' | 'week' | 'month'
export type NewsColumn = 'tw' | 'intl'
export type NewsCategory = 'all' | 'politics' | 'society' | 'entertainment' | 'finance' | 'tech' | 'life'

export interface NewsItem {
  id: string
  title: string
  url: string
  source: string
  publishedAt: string
  summary?: string
  sentiment?: SentimentLabel
  category?: NewsCategory
  column: NewsColumn
}

export interface NewsResponse {
  items: NewsItem[]
  updatedAt: string
  fromCache: boolean
}

export interface SummaryResponse {
  text: string
  generatedAt: string
  fromCache: boolean
}

export interface KeywordsResponse {
  keywords: Array<{ word: string; count: number }>
  fromCache: boolean
}
