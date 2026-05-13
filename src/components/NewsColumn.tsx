import { NewsItem } from '@/types'
import NewsCard from './NewsCard'
import LoadingState from './LoadingState'

interface NewsColumnProps {
  title: string
  subtitle?: string
  items: NewsItem[]
  loading?: boolean
  error?: string
}

export default function NewsColumn({
  title,
  subtitle,
  items,
  loading,
  error,
}: NewsColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="mb-1">
        <h2 className="text-base font-semibold text-[#2C2C2C]">{title}</h2>
        {subtitle && (
          <p className="text-xs text-[#888888] mt-0.5">{subtitle}</p>
        )}
      </div>

      {loading && <LoadingState count={5} />}

      {error && (
        <div className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-sm text-[#888888] text-center py-12">
          此時段無新聞資料
        </div>
      )}

      {!loading && !error && items.map(item => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  )
}
