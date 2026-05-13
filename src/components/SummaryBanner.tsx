interface SummaryBannerProps {
  text: string
  loading?: boolean
}

export default function SummaryBanner({ text, loading }: SummaryBannerProps) {
  return (
    <div className="bg-[#EBF0F7] border border-[#5B7FA6]/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-[#5B7FA6]" />
        <span className="text-xs font-medium text-[#5B7FA6] uppercase tracking-widest">
          AI 輿情分析
        </span>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 bg-[#5B7FA6]/10 rounded animate-pulse w-full" />
          <div className="h-4 bg-[#5B7FA6]/10 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-[#5B7FA6]/10 rounded animate-pulse w-4/6" />
          <div className="h-4 bg-[#5B7FA6]/10 rounded animate-pulse w-full mt-3" />
          <div className="h-4 bg-[#5B7FA6]/10 rounded animate-pulse w-3/4" />
        </div>
      ) : (
        <p className="text-sm text-[#2C2C2C] leading-relaxed whitespace-pre-wrap">{text}</p>
      )}
    </div>
  )
}
