import { TabRange } from '@/types'

export function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

export function getDateRange(tab: TabRange): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date()
  switch (tab) {
    case 'today':
      from.setHours(0, 0, 0, 0)
      break
    case '3days':
      from.setDate(from.getDate() - 3)
      break
    case 'week':
      from.setDate(from.getDate() - 7)
      break
    case 'month':
      from.setDate(from.getDate() - 30)
      break
  }
  return { from, to }
}

export function filterByDateRange<T extends { publishedAt: string }>(
  items: T[],
  tab: TabRange
): T[] {
  const { from, to } = getDateRange(tab)
  return items.filter(item => {
    const d = new Date(item.publishedAt)
    return d >= from && d <= to
  })
}

export function dedupeByTitle<T extends { title: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = item.title.slice(0, 30).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function truncate(str: string, maxLen: number): string {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分鐘前`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} 小時前`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} 天前`
  return date.toLocaleDateString('zh-TW')
}
