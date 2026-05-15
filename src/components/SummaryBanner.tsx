'use client'

import { useState, useEffect } from 'react'
import { SummaryData, NewsItem } from '@/types'

interface SummaryBannerProps {
  data: SummaryData | null
  loading?: boolean
}

interface SectionConfig {
  key: keyof Pick<SummaryData, 'topics' | 'dynamics' | 'watchlist' | 'viral'>
  title: string
  accent: string
  bg: string
  numbered?: boolean
}

const SECTIONS: SectionConfig[] = [
  { key: 'topics',    title: '當前主要議題',      accent: '#5B7FA6', bg: '#EBF0F7', numbered: true },
  { key: 'dynamics',  title: '動向 & 升溫預測',   accent: '#D4874A', bg: '#FDF4EC' },
  { key: 'watchlist', title: '長期觀察 & 今日警示', accent: '#7A62A8', bg: '#F2EFF8' },
  { key: 'viral',     title: 'AI 預測社群潛力',   accent: '#C2477A', bg: '#FDF0F5' },
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

// ─── Person modal ────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function PersonModal({ name, onClose }: { name: string; onClose: () => void }) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchNews = async () => {
      try {
        const [tw, intl] = await Promise.all([
          fetch(`/api/news?q=${encodeURIComponent(name)}&tab=month&col=tw&limit=20`).then(r => r.json()),
          fetch(`/api/news?q=${encodeURIComponent(name)}&tab=month&col=intl&limit=10`).then(r => r.json()),
        ])
        if (!cancelled) {
          const combined: NewsItem[] = [
            ...(tw.items ?? []),
            ...(intl.items ?? []),
          ].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          setItems(combined.slice(0, 25))
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchNews()
    return () => { cancelled = true }
  }, [name])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E4DC] bg-[#EFF6F2]">
          <div>
            <h3 className="text-base font-semibold text-[#2C2C2C]">{name}</h3>
            <p className="text-xs text-[#888888] mt-0.5">近 30 天相關新聞</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#888888] hover:text-[#2C2C2C] hover:bg-[#E8E4DC] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
          {loading && (
            <div className="space-y-2 py-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-[#F7F5F0] rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <p className="text-sm text-[#888888] text-center py-10">
              找不到近 30 天內含「{name}」的新聞
            </p>
          )}

          {!loading && items.map(item => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-[#E8E4DC] px-3.5 py-2.5 hover:border-[#4A8870]/50 hover:bg-[#F3F8F5] transition-colors group"
            >
              <p className="text-sm text-[#2C2C2C] leading-snug group-hover:text-[#2C5243]">
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[11px] text-[#888888]">{item.source}</span>
                <span className="text-[11px] text-[#CCCCCC]">·</span>
                <span className="text-[11px] text-[#888888]">{formatDate(item.publishedAt)}</span>
                <span className={`ml-auto text-[11px] px-1.5 py-0.5 rounded-full ${
                  item.column === 'tw' ? 'bg-[#EBF0F7] text-[#5B7FA6]' : 'bg-[#F2EFF8] text-[#7A62A8]'
                }`}>
                  {item.column === 'tw' ? '台灣' : '國際'}
                </span>
              </div>
            </a>
          ))}
        </div>

        {!loading && items.length > 0 && (
          <div className="px-5 py-3 border-t border-[#E8E4DC] text-center">
            <a
              href={`/archive?q=${encodeURIComponent(name)}`}
              className="text-xs text-[#5B7FA6] hover:underline"
            >
              在存檔中搜尋更多「{name}」相關新聞 →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── People row ──────────────────────────────────────────────────────────────

function PeopleRow({ people }: { people: string[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  if (people.length === 0) return null

  return (
    <>
      <div className="rounded-lg p-4 bg-[#EFF6F2]" style={{ borderLeft: '3px solid #4A8870' }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 text-[#4A8870]">
          當前話題人物
        </p>
        <div className="flex flex-wrap gap-2">
          {people.map((name, i) => (
            <button
              key={i}
              onClick={() => setSelected(name)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-[#4A8870]/30 text-[#2C5243] hover:bg-[#4A8870] hover:text-white hover:border-[#4A8870] transition-colors cursor-pointer"
              title={`查看「${name}」相關新聞`}
            >
              {name}
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[#AAAAAA] mt-2.5">點擊人物查看相關新聞</p>
      </div>

      {selected && (
        <PersonModal name={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

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

// ─── Main component ──────────────────────────────────────────────────────────

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

          {/* 當前話題人物（可點擊） */}
          {data.people?.length > 0 && <PeopleRow people={data.people} />}

          {/* 四格分析 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SECTIONS.map(({ key, ...rest }) => (
              <Section key={key} {...rest} items={(data[key] as string[] | undefined) ?? []} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
