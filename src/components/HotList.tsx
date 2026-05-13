interface HotData {
  topics: string[]
  keywords: string[]
}

interface HotListProps {
  tw: HotData
  intl: HotData
  loading?: boolean
}

function HotColumn({
  label,
  data,
  loading,
}: {
  label: string
  data: HotData
  loading?: boolean
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-[#888888] uppercase tracking-widest">
          {label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 五大議題 */}
        <div>
          <p className="text-xs text-[#5B7FA6] font-medium mb-2">五大議題</p>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-5 bg-[#EFECE5] rounded animate-pulse" style={{ width: `${65 + i * 5}%` }} />
              ))}
            </div>
          ) : data.topics.length === 0 ? (
            <p className="text-xs text-[#888888]">資料不足</p>
          ) : (
            <ol className="space-y-1.5">
              {data.topics.map((topic, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-[#5B7FA6] w-4 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-xs text-[#2C2C2C] leading-snug">{topic}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* 五大關鍵字 */}
        <div>
          <p className="text-xs text-[#5B7FA6] font-medium mb-2">五大關鍵字</p>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-5 bg-[#EFECE5] rounded animate-pulse" style={{ width: `${50 + i * 5}%` }} />
              ))}
            </div>
          ) : data.keywords.length === 0 ? (
            <p className="text-xs text-[#888888]">資料不足</p>
          ) : (
            <ol className="space-y-1.5">
              {data.keywords.map((kw, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#5B7FA6] w-4 flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#EBF0F7] text-[#3D5A7A] font-medium">
                    {kw}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HotList({ tw, intl, loading }: HotListProps) {
  return (
    <div className="bg-white border border-[#E8E4DC] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-[#E8844A]" />
        <span className="text-xs font-medium text-[#E8844A] uppercase tracking-widest">
          熱門排行
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <HotColumn label="台灣" data={tw} loading={loading} />
        <div className="md:border-l md:border-[#E8E4DC] md:pl-8">
          <HotColumn label="國際" data={intl} loading={loading} />
        </div>
      </div>
    </div>
  )
}
