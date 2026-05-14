export type SentimentLabel = 'positive' | 'negative' | 'neutral'
export type TabRange = 'today' | '3days' | 'week' | 'month'
export type NewsColumn = 'tw' | 'intl'
export type NewsCategory = 'all' | 'politics' | 'society' | 'life'

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
  total?: number
  page?: number
  limit?: number
  totalPages?: number
}

export interface SummaryData {
  overview: string
  topics: string[]
  brewing: string[]
  upcoming: string[]
  longterm: string[]
  people: string[]
  viral: string[]
  alerts: string[]
}

export interface SummaryResponse {
  data: SummaryData
  generatedAt: string
  fromCache: boolean
}

export interface KeywordsResponse {
  keywords: Array<{ word: string; count: number }>
  fromCache: boolean
}
