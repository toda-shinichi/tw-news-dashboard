'use client'

import { useState, useMemo } from 'react'
import clsx from 'clsx'
import { NewsItem, NewsCategory } from '@/types'
import { computeHotKeywords, extractPeopleFromTitles } from '@/lib/utils'

interface HotData {
  topics: string[]
  keywords: string[]
  people: string[]
}

interface HotListProps {
  tw: HotData
  intl: HotData
  loading?: boolean
  twItems?: NewsItem[]
  intlItems?: NewsItem[]
}

const CATEGORY_TABS: { value: NewsCategory; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'politics', label: '政治' },
  { value: 'society', label: '社會' },
  { value: 'entertainment', label: '娛樂' },
  { value: 'finance', label: '財經' },
  { value: 'tech', label: '科技' },
  { value: 'life', label: '民生' },
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

function HotColumn({
  label,
  data,
  loading,
  filteredTitles,
  isFiltered,
}: {
  label: string
  data: HotData
  loading?: boolean
  filteredTitles: string[]
  isFiltered: boolean
}) {
  const computedTopics = useMemo(
    () => (isFiltered ? computeHotKeywords(filteredTitles, 5, 3, 6) : []),
    [isFiltered, filteredTitles]
  )
  const computedKeywords = useMemo(
    () => (isFiltered ? computeHotKeywords(filteredTitles, 5, 2, 3) : []),
    [isFiltered, filteredTitles]
  )
  const computedPeople = useMemo(
    () => (isFiltered ? extractPeopleFromTitles(filteredTitles, 5) : []),
    [isFiltered, filteredTitles]
  )

  const displayTopics = isFiltered ? computedTopics : data.topics
  const displayKeywords = isFiltered ? computedKeywords : data.keywords
  const displayPeople = isFiltered ? computedPeople : data.people

  const noData = isFiltered && filteredTitles.length < 3

  return (
    <div className="flex-1 min-w-0 space-y-4">
      <p className="text-xs font-medium text-[#888888] uppercase tracking-widest">{label}</p>

      {noData ? (
        <p className="text-sm text-[#AAAAAA]">此分類新聞量不足，請切換至「全部」查看 AI 分析結果。</p>
      ) : (
        <>
          {/* 五大議題 */}
          <div>
            <p className="text-xs text-[#5B7FA6] font-medium mb-2">五大議題</p>
            <RankedList items={displayTopics} loading={loading} />
          </div>

          {/* 五大關鍵字 */}
          <div>
            <p className="text-xs text-[#5B7FA6] font-medium mb-2">五大關鍵字</p>
            <TagRow items={displayKeywords} loading={loading} />
          </div>

          {/* 五大人物 */}
          <div>
            <p className="text-xs text-[#5B7FA6] font-medium mb-2">五大人物</p>
            <TagRow items={displayPeople} loading={loading} />
          </div>
        </>
      )}
    </div>
  )
}

export default function HotList({ tw, intl, loading, twItems = [], intlItems = [] }: HotListProps) {
  const [selectedCat, setSelectedCat] = useState<NewsCategory>('all')
  const isFiltered = selectedCat !== 'all'

  const filteredTwTitles = useMemo(
    () => (isFiltered ? twItems.filter(i => i.category === selectedCat).map(i => i.title) : []),
    [isFiltered, twItems, selectedCat]
  )
  const filteredIntlTitles = useMemo(
    () => (isFiltered ? intlItems.filter(i => i.category === selectedCat).map(i => i.title) : []),
    [isFiltered, intlItems, selectedCat]
  )

  return (
    <div className="bg-white border border-[#E8E4DC] rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#E8844A]" />
          <span className="text-xs font-medium text-[#E8844A] uppercase tracking-widest">熱門排行</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setSelectedCat(tab.value)}
              className={clsx(
                'px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
                selectedCat === tab.value
                  ? 'bg-[#E8844A] text-white'
                  : 'bg-[#EFECE5] text-[#555555] hover:text-[#2C2C2C]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <HotColumn
          label="台灣"
          data={tw}
          loading={loading}
          filteredTitles={filteredTwTitles}
          isFiltered={isFiltered}
        />
        <div className="md:border-l md:border-[#E8E4DC] md:pl-8">
          <HotColumn
            label="國際"
            data={intl}
            loading={loading}
            filteredTitles={filteredIntlTitles}
            isFiltered={isFiltered}
          />
        </div>
      </div>
    </div>
  )
}
