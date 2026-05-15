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
  direction: string[]         // 方向預估：升溫預測 + 可能走向 + 長期觀察 + 警戒議題
  politics_issues: string[]   // 政治：當前重要議題
  society_issues: string[]    // 社會：當前重要議題
  intl_issues: string[]       // 國際：當前重要議題
  life_issues: string[]       // 民生：當前重要議題
  people: string[]
  viral: string[]
  // Legacy fields — kept for reading old cache/history snapshots
  topics?: string[]
  dynamics?: string[]
  watchlist?: string[]
  brewing?: string[]
  upcoming?: string[]
  longterm?: string[]
  alerts?: string[]
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
