import { SummaryData } from '@/types'

interface SummaryBannerProps {
  data: SummaryData | null
  loading?: boolean
}

interface SectionConfig {
  key: keyof Pick<SummaryData, 'topics' | 'brewing' | 'upcoming' | 'longterm'>
  title: string
  accent: string
  bg: string
  numbered?: boolean
}

const SECTIONS: SectionConfig[] = [
  { key: 'topics',   title: '當前主要議題', accent: '#5B7FA6', bg: '#EBF0F7', numbered: true },
  { key: 'brewing',  title: '醞釀中的動向', accent: '#D4874A', bg: '#FDF4EC' },
  { key: 'upcoming', title: '即將升溫話題', accent: '#C0554A', bg: '#FDF0EF' },
  { key: 'longterm', title: '長期觀察重點', accent: '#7A62A8', bg: '#F2EFF8' },
]

function Section({ title, items, accent, bg, numbered }: SectionConfig & { items: string[] }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: bg, borderLeft: `3px solid ${accent}` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: accent }}>
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-[#AAAAAA]">資料不足</p>
      ) : numbered ? (
        <ol className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-xs font-semibold w-4 flex-shrink-0 mt-0.5" style={{ color: accent }}>
                {i + 1}
              </span>
              <span className="text-sm text-[#2C2C2C] leading-snug">{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: accent }}
              />
              <span className="text-sm text-[#2C2C2C] leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="p-5 space-y-4">
      <div className="space-y-2">
        <div className="h-4 bg-[#EFECE5] rounded animate-pulse w-full" />
        <div className="h-4 bg-[#EFECE5] rounded animate-pulse w-5/6" />
        <div className="h-4 bg-[#EFECE5] rounded animate-pulse w-4/6" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg p-4 bg-[#F7F5F0] space-y-2">
            <div className="h-3 bg-[#EFECE5] rounded animate-pulse w-1/2" />
            {[...Array(4)].map((_, j) => (
              <div key={j} className="h-4 bg-[#EFECE5] rounded animate-pulse" style={{ width: `${70 + j * 5}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SummaryBanner({ data, loading }: SummaryBannerProps) {
  return (
    <div className="bg-white border border-[#E8E4DC] rounded-xl overflow-hidden">
      <div className="bg-[#EBF0F7] px-5 py-3 flex items-center gap-2 border-b border-[#5B7FA6]/15">
        <span className="w-2 h-2 rounded-full bg-[#5B7FA6]" />
        <span className="text-xs font-medium text-[#5B7FA6] uppercase tracking-widest">
          AI 輿情分析
        </span>
      </div>

      {loading ? (
        <Skeleton />
      ) : !data || !data.overview ? (
        <div className="p-5 text-sm text-[#888888]">無法載入分析，請稍後重試。</div>
      ) : (
        <div className="p-5 space-y-4">
          {/* 整體輿情概覽 */}
          <p className="text-sm text-[#2C2C2C] leading-relaxed bg-[#F7F5F0] rounded-lg px-4 py-3 border border-[#E8E4DC]">
            {data.overview}
          </p>

          {/* 四格分析 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SECTIONS.map(({ key, ...rest }) => (
              <Section key={key} {...rest} items={data[key]} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
