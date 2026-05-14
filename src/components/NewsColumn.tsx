'use client'

import { useState, useMemo } from 'react'
import clsx from 'clsx'
import { NewsItem, NewsCategory } from '@/types'
import NewsCard from './NewsCard'
import LoadingState from './LoadingState'

interface NewsColumnProps {
  title: string
  subtitle?: string
  items: NewsItem[]
  loading?: boolean
  error?: string
  selectedKeyword?: string | null
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

export default function NewsColumn({
  title,
  subtitle,
  items,
  loading,
  error,
  selectedKeyword,
}: NewsColumnProps) {
  const [selectedCat, setSelectedCat] = useState<NewsCategory>('all')

  const displayItems = useMemo(() => {
    let result = items
    if (selectedCat !== 'all') {
      result = result.filter(item => item.category === selectedCat)
    }
    if (selectedKeyword) {
      result = result.filter(
        item =>
          item.title.includes(selectedKeyword) ||
          item.summary?.includes(selectedKeyword)
      )
    }
    return result
  }, [items, selectedCat, selectedKeyword])

  return (
    <div className="flex flex-col gap-3">
      <div className="mb-1">
        <h2 className="text-base font-semibold text-[#2C2C2C]">{title}</h2>
        {subtitle && <p className="text-xs text-[#888888] mt-0.5">{subtitle}</p>}
      </div>

      {/* Category tabs */}
      {!loading && !error && (
        <div className="flex gap-1 flex-wrap">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setSelectedCat(tab.value)}
              className={clsx(
                'px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
                selectedCat === tab.value
                  ? 'bg-[#5B7FA6] text-white'
                  : 'bg-[#EFECE5] text-[#555555] hover:text-[#2C2C2C]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {selectedKeyword && (
        <div className="text-xs text-[#5B7FA6] bg-[#EBF0F7] rounded-lg px-3 py-1.5">
          篩選關鍵字：<strong>{selectedKeyword}</strong>
        </div>
      )}

      {loading && <LoadingState count={5} />}

      {error && (
        <div className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</div>
      )}

      {!loading && !error && displayItems.length === 0 && (
        <div className="text-sm text-[#888888] text-center py-12">
          {items.length > 0 ? '此分類無符合條件的新聞' : '此時段無新聞資料'}
        </div>
      )}

      {!loading && !error && displayItems.map(item => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  )
}
