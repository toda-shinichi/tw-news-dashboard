'use client'

import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { TabRange } from '@/types'

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

function RankedList({ items, loading }: { items: string[]; loading?: boolean }) {
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
          <span className="text-sm text-[#2C2C2C] leading-snug">{item}</span>
        </li>
      ))}
    </ol>
  )
}

function TagRow({ items, loading }: { items: string[]; loading?: boolean }) {
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
        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#EBF0F7] text-[#3D5A7A] font-medium">
          {item}
        </span>
      ))}
    </div>
  )
}

function HotColumn({ label, data, loading }: { label: string; data: HotData; loading?: boolean }) {
  return (
    <div className="flex-1 min-w-0 space-y-4">
      <p className="text-xs font-medium text-[#888888] uppercase tracking-widest">{label}</p>

      <div>
        <p className="text-xs text-[#5B7FA6] font-medium mb-2">五大議題</p>
        <RankedList items={data.topics} loading={loading} />
      </div>

      <div>
        <p className="text-xs text-[#5B7FA6] font-medium mb-2">五大關鍵字</p>
        <TagRow items={data.keywords} loading={loading} />
      </div>

      <div>
        <p className="text-xs text-[#5B7FA6] font-medium mb-2">五大人物</p>
        <TagRow items={data.people} loading={loading} />
      </div>
    </div>
  )
}

export default function HotList({ tw, loading, tab }: HotListProps) {
  const [selectedCat, setSelectedCat] = useState<HotFilter>('all')
  const [catData, setCatData] = useState<HotData | null>(null)
  const [catLoading, setCatLoading] = useState(false)

  useEffect(() => {
    if (selectedCat === 'all') {
      setCatData(null)
      return
    }
    let cancelled = false
    setCatLoading(true)
    fetch(`/api/hotlist?tab=${tab}&cat=${selectedCat}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) setCatData(d.tw ?? null)
      })
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

      <HotColumn label="台灣新聞" data={displayTw} loading={isLoading} />
    </div>
  )
}
