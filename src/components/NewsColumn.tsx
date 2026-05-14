'use client'

import { useState, useMemo, useEffect } from 'react'
import clsx from 'clsx'
import { NewsItem, NewsCategory } from '@/types'
import NewsCard from './NewsCard'
import LoadingState from './LoadingState'

const PAGE_SIZE = 30

interface NewsColumnProps {
  title: string
  subtitle?: string
  items: NewsItem[]
  loading?: boolean
  error?: string
  building?: boolean
  selectedKeyword?: string | null
}

const CATEGORY_TABS: { value: NewsCategory; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'politics', label: '政治' },
  { value: 'society', label: '社會' },
  { value: 'life', label: '民生' },
]

const LIFE_CATS = new Set(['life', 'entertainment', 'finance', 'tech'])

export default function NewsColumn({
  title,
  subtitle,
  items,
  loading,
  error,
  building,
  selectedKeyword,
}: NewsColumnProps) {
  const [selectedCat, setSelectedCat] = useState<NewsCategory>('all')
  const [page, setPage] = useState(1)

  const filteredItems = useMemo(() => {
    let result = items
    if (selectedCat !== 'all') {
      result = result.filter(item =>
        selectedCat === 'life'
          ? LIFE_CATS.has(item.category ?? '')
          : item.category === selectedCat
      )
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

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [selectedCat, selectedKeyword])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const displayItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

      {!loading && error && (
        <div className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</div>
      )}

      {!loading && !error && building && (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="text-2xl animate-spin inline-block">⟳</span>
          <p className="text-sm font-medium text-[#5B7FA6]">正在建立資料庫</p>
          <p className="text-xs text-[#888888]">首次啟動需從各媒體抓取新聞，約需 30–60 秒。<br />請稍後手動重新整理頁面。</p>
        </div>
      )}

      {!loading && !error && !building && displayItems.length === 0 && (
        <div className="text-sm text-[#888888] text-center py-12">
          {items.length > 0 ? '此分類無符合條件的新聞' : '此時段無新聞資料'}
        </div>
      )}

      {!loading && !error && displayItems.map(item => (
        <NewsCard key={item.id} item={item} />
      ))}

      {/* Pagination */}
      {!loading && !error && filteredItems.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs text-[#5B7FA6] border border-[#E8E4DC] rounded-lg hover:bg-[#EBF0F7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← 上一頁
          </button>
          <span className="text-xs text-[#888888]">
            第 {page} / {totalPages} 頁・共 {filteredItems.length} 則
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-xs text-[#5B7FA6] border border-[#E8E4DC] rounded-lg hover:bg-[#EBF0F7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            下一頁 →
          </button>
        </div>
      )}
    </div>
  )
}
