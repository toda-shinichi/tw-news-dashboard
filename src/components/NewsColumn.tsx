'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import clsx from 'clsx'
import { NewsItem } from '@/types'
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
}

type FilterValue = 'all' | 'politics' | 'society' | 'intl' | 'life'

const CATEGORY_TABS: { value: FilterValue; label: string }[] = [
  { value: 'all',      label: '全部' },
  { value: 'politics', label: '政治' },
  { value: 'society',  label: '社會' },
  { value: 'intl',     label: '國際' },
  { value: 'life',     label: '民生' },
]

const LIFE_CATS = new Set(['life', 'entertainment', 'finance', 'tech'])

export default function NewsColumn({
  title,
  subtitle,
  items,
  loading,
  error,
  building,
}: NewsColumnProps) {
  const [selectedCat, setSelectedCat] = useState<FilterValue>('all')
  const [page, setPage] = useState(1)
  const topRef = useRef<HTMLDivElement>(null)

  const filteredItems = useMemo(() => {
    let result = [...items]

    if (selectedCat === 'intl') {
      result = result.filter(item => item.column === 'intl')
    } else if (selectedCat === 'politics') {
      result = result.filter(item => item.category === 'politics' && item.column === 'tw')
    } else if (selectedCat === 'society') {
      result = result.filter(item => item.category === 'society' && item.column === 'tw')
    } else if (selectedCat === 'life') {
      result = result.filter(item => LIFE_CATS.has(item.category ?? '') && item.column === 'tw')
    }
    return result
  }, [items, selectedCat])

  useEffect(() => {
    setPage(1)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedCat])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const displayItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function changePage(next: number) {
    setPage(next)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-col gap-3" ref={topRef}>
      <div className="mb-1">
        <h2 className="text-base font-semibold text-[#2C2C2C]">{title}</h2>
        {subtitle && <p className="text-xs text-[#888888] mt-0.5">{subtitle}</p>}
      </div>

      {/* Category tabs — horizontal scroll on mobile */}
      {!error && (
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none -mx-0.5 px-0.5">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setSelectedCat(tab.value)}
              className={clsx(
                'px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0',
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

      {/* Active filter indicator */}
      {selectedCat !== 'all' && (
        <div className="text-xs text-[#5B7FA6] bg-[#EBF0F7] rounded-lg px-3 py-1.5">
          分類：<strong>{CATEGORY_TABS.find(t => t.value === selectedCat)?.label}</strong>
        </div>
      )}

      {/* First-load skeleton (no data yet) */}
      {loading && items.length === 0 && <LoadingState count={5} />}

      {/* Refresh-in-progress indicator when data already exists */}
      {loading && items.length > 0 && (
        <div className="text-xs text-[#5B7FA6] bg-[#EBF0F7] rounded-lg px-3 py-1.5 flex items-center gap-2">
          <span className="animate-spin inline-block">⟳</span>
          正在更新新聞…
        </div>
      )}

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

      {!error && !building && filteredItems.length === 0 && !loading && (
        <div className="text-sm text-[#888888] text-center py-12">
          {items.length > 0 ? '此分類無符合條件的新聞' : '此時段無新聞資料'}
        </div>
      )}

      {!error && displayItems.map(item => (
        <NewsCard key={item.id} item={item} />
      ))}

      {!error && filteredItems.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => changePage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs text-[#5B7FA6] border border-[#E8E4DC] rounded-lg hover:bg-[#EBF0F7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← 上一頁
          </button>
          <span className="text-xs text-[#888888]">
            第 {page} / {totalPages} 頁・共 {filteredItems.length} 則
          </span>
          <button
            onClick={() => changePage(Math.min(totalPages, page + 1))}
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
