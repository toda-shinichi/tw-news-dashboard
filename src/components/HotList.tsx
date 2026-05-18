'use client'

import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { TabRange, NewsItem } from '@/types'

interface HotData {
  topics: string[]
  keywords: string[]
  people: string[]
}

interface HotListProps {
  tw: HotData
  loading?: boolean
  tab: TabRange
}

type HotFilter = 'all' | 'politics' | 'society' | 'intl' | 'life'

const CATEGORY_TABS: { value: HotFilter; label: string }[] = [
  { value: 'all',      label: '全部' },
  { value: 'politics', label: '政治' },
  { value: 'society',  label: '社會' },
  { value: 'intl',     label: '國際' },
  { value: 'life',     label: '民生' },
]

// ─── News modal ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function NewsModal({ query, onClose }: { query: string; onClose: () => void }) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const q = encodeURIComponent(query)
    Promise.all([
      fetch(`/api/news?q=${q}&tab=today&col=tw&limit=20`).then(r => r.json()),
      fetch(`/api/news?q=${q}&tab=today&col=intl&limit=10`).then(r => r.json()),
    ]).then(([tw, intl]) => {
      if (!cancelled) {
        const combined: NewsItem[] = [
          ...(tw.items ?? []),
          ...(intl.items ?? []),
        ].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        setItems(combined.slice(0, 25))
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [query])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E4DC] bg-[#FDF4EE]">
          <div>
            <h3 className="text-base font-semibold text-[#2C2C2C]">{query}</h3>
            <p className="text-xs text-[#888888] mt-0.5">24 小時內相關新聞</p>
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
              24 小時內沒有含「{query}」的新聞
            </p>
          )}
          {!loading && items.map(item => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-[#E8E4DC] px-3.5 py-2.5 hover:border-[#E8844A]/40 hover:bg-[#FDF4EE] transition-colors group"
            >
              <p className="text-sm text-[#2C2C2C] leading-snug group-hover:text-[#7A3B10]">
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-[#888888]">{item.source}</span>
                <span className="text-[11px] text-[#CCCCCC]">·</span>
                <span className="text-[11px] text-[#888888]">{formatDate(item.publishedAt)}</span>
              </div>
            </a>
          ))}
        </div>
        {!loading && items.length > 0 && (
          <div className="px-5 py-3 border-t border-[#E8E4DC] text-center">
            <span className="text-xs text-[#AAAAAA]">僅顯示過去 24 小時內相關報導</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── List components ──────────────────────────────────────────────────────────

function RankedList({
  items, loading, onSelect,
}: { items: string[]; loading?: boolean; onSelect: (q: string) => void }) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-4 bg-[#EFECE5] rounded animate-pulse" style={{ width: `${60 + i * 7}%` }} />
        ))}
      </div>
    )
  }
  if (items.length === 0) return <p className="text-xs text-[#AAAAAA]">資料不足</p>
  return (
    <ol className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-xs font-semibold text-[#5B7FA6] w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
          <button
            onClick={() => onSelect(item)}
            className="text-sm text-[#2C2C2C] leading-snug text-left hover:text-[#E8844A] hover:underline underline-offset-2 transition-colors"
          >
            {item}
          </button>
        </li>
      ))}
    </ol>
  )
}

function TagRow({
  items, loading, onSelect,
}: { items: string[]; loading?: boolean; onSelect: (q: string) => void }) {
  if (loading) {
    return (
      <div className="flex gap-1.5 flex-wrap">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-5 w-14 bg-[#EFECE5] rounded-full animate-pulse" />
        ))}
      </div>
    )
  }
  if (items.length === 0) return <span className="text-xs text-[#AAAAAA]">資料不足</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => onSelect(item)}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#EBF0F7] text-[#3D5A7A] font-medium hover:bg-[#E8844A]/10 hover:text-[#E8844A] transition-colors"
        >
          {item}
        </button>
      ))}
    </div>
  )
}

function HotColumn({
  label, data, loading, onSelect,
}: { label: string; data: HotData; loading?: boolean; onSelect: (q: string) => void }) {
  return (
    <div className="flex-1 min-w-0 space-y-4">
      <p className="text-xs font-medium text-[#888888] uppercase tracking-widest">{label}</p>

      <div>
        <p className="text-xs text-[#5B7FA6] font-medium mb-2">五大議題</p>
        <RankedList items={data.topics} loading={loading} onSelect={onSelect} />
      </div>

      <div>
        <p className="text-xs text-[#5B7FA6] font-medium mb-2">五大關鍵字</p>
        <TagRow items={data.keywords} loading={loading} onSelect={onSelect} />
      </div>

      <div>
        <p className="text-xs text-[#5B7FA6] font-medium mb-2">五大人物</p>
        <TagRow items={data.people} loading={loading} onSelect={onSelect} />
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function HotList({ tw, loading, tab }: HotListProps) {
  const [selectedCat, setSelectedCat] = useState<HotFilter>('all')
  const [catData, setCatData] = useState<HotData | null>(null)
  const [catLoading, setCatLoading] = useState(false)
  const [modalQuery, setModalQuery] = useState<string | null>(null)

  useEffect(() => {
    if (selectedCat === 'all') { setCatData(null); return }
    let cancelled = false
    setCatLoading(true)
    fetch(`/api/hotlist?tab=${tab}&cat=${selectedCat}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setCatData(d.tw ?? null) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCatLoading(false) })
    return () => { cancelled = true }
  }, [selectedCat, tab])

  useEffect(() => {
    setCatData(null)
    setSelectedCat('all' as HotFilter)
  }, [tab])

  const displayTw = catData ?? tw
  const isLoading = catLoading || loading

  return (
    <>
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#E8844A]" />
            <span className="text-xs font-medium text-[#E8844A] uppercase tracking-widest">熱門排行</span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {CATEGORY_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setSelectedCat(t.value)}
                className={clsx(
                  'px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0',
                  selectedCat === t.value
                    ? 'bg-[#E8844A] text-white'
                    : 'bg-[#EFECE5] text-[#555555] hover:text-[#2C2C2C]'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <HotColumn
          label="台灣新聞"
          data={displayTw}
          loading={isLoading}
          onSelect={setModalQuery}
        />
      </div>

      {modalQuery && (
        <NewsModal query={modalQuery} onClose={() => setModalQuery(null)} />
      )}
    </>
  )
}
