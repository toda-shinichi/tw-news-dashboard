import { NewsItem, SentimentLabel } from '@/types'
import { formatRelativeTime } from '@/lib/utils'

interface NewsCardProps {
  item: NewsItem
}

const SENTIMENT_CONFIG: Record<
  SentimentLabel,
  { bg: string; text: string; label: string }
> = {
  positive: { bg: 'bg-green-50', text: 'text-green-700', label: '正面' },
  negative: { bg: 'bg-red-50', text: 'text-red-600', label: '負面' },
  neutral: { bg: 'bg-gray-100', text: 'text-gray-500', label: '中性' },
}

const SOURCE_BADGE: Record<string, { bg: string; text: string }> = {
  'PTT 八卦板': { bg: 'bg-orange-50', text: 'text-orange-600' },
  'Dcard':      { bg: 'bg-purple-50', text: 'text-purple-600' },
}

export default function NewsCard({ item }: NewsCardProps) {
  const { bg, text, label } = SENTIMENT_CONFIG[item.sentiment ?? 'neutral']
  const sourceBadge = SOURCE_BADGE[item.source]

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white border border-[#E8E4DC] rounded-xl p-4 hover:shadow-md hover:border-[#5B7FA6]/30 transition-all group"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {sourceBadge ? (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${sourceBadge.bg} ${sourceBadge.text}`}>
              {item.source}
            </span>
          ) : (
            <span className="text-xs text-[#888888] truncate max-w-[90px]">{item.source}</span>
          )}
          <span className="text-[#888888]/40 text-xs flex-shrink-0">·</span>
          <span className="text-xs text-[#888888] whitespace-nowrap flex-shrink-0">
            {formatRelativeTime(item.publishedAt)}
          </span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${bg} ${text}`}
        >
          {label}
        </span>
      </div>
      <h3 className="text-sm font-medium text-[#2C2C2C] leading-snug line-clamp-2 group-hover:text-[#5B7FA6] transition-colors">
        {item.title}
      </h3>
      {item.summary && (
        <p className="text-xs text-[#888888] mt-1.5 line-clamp-2 leading-relaxed">
          {item.summary}
        </p>
      )}
    </a>
  )
}
