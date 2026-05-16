'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import clsx from 'clsx'
import { NewsItem } from '@/types'
import NewsCard from './NewsCard'
import LoadingState from './LoadingState'

function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number
  totalPages: number
  total: number
  onChange: (p: number) => void
}) {
  const [jumpVal, setJumpVal] = useState('')

  function handleJump(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(jumpVal)
    if (!isNaN(n) && n >= 1 && n <= totalPages) onChange(n)
    setJumpVal('')
  }

  // Build page number list with ellipsis
  function pageNumbers(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '…')[] = []
    const addPage = (n: number) => { if (!pages.includes(n)) pages.push(n) }
    addPage(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) addPage(i)
    if (page < totalPages - 2) pages.push('…')
    addPage(totalPages)
    return pages
  }

  const btnBase = 'min-w-[32px] h-8 px-1.5 rounded-md text-xs font-medium transition-colors'

  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      <div className="flex items-center gap-1 flex-wrap justify-center">
        {/* Prev */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className={clsx(btnBase, 'px-2.5 border border-[#E8E4DC] text-[#5B7FA6] hover:bg-[#EBF0F7] disabled:opacity-30 disabled:cursor-not-allowed')}
        >←</button>

        {/* Page numbers */}
        {pageNumbers().map((n, i) =>
          n === '…'
            ? <span key={`e${i}`} className="text-xs text-[#AAAAAA] px-0.5">…</span>
            : <button
                key={n}
                onClick={() => onChange(n as number)}
                className={clsx(btnBase, n === page
                  ? 'bg-[#5B7FA6] text-white'
                  : 'border border-[#E8E4DC] text-[#555555] hover:bg-[#EBF0F7]'
                )}
              >{n}</button>
        )}

        {/* Next */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className={clsx(btnBase, 'px-2.5 border border-[#E8E4DC] text-[#5B7FA6] hover:bg-[#EBF0F7] disabled:opacity-30 disabled:cursor-not-allowed')}
        >→</button>
      </div>

      {/* Jump + total count */}
      <div className="flex items-center gap-2 text-xs text-[#888888]">
        <span>共 {total} 則・第 {page}/{totalPages} 頁</span>
        {totalPages > 5 && (
          <form onSubmit={handleJump} className="flex items-center gap-1">
            <span>跳至</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpVal}
              onChange={e => setJumpVal(e.target.value)}
              className="w-12 h-6 px-1.5 text-xs border border-[#E8E4DC] rounded-md text-center focus:outline-none focus:border-[#5B7FA6]"
              placeholder="頁"
            />
            <button
              type="submit"
              className="h-6 px-2 text-xs border border-[#E8E4DC] rounded-md text-[#5B7FA6] hover:bg-[#EBF0F7] transition-colors"
            >Go</button>
          </form>
        )}
      </div>
    </div>
  )
}

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
        <Pagination
          page={page}
          totalPages={totalPages}
          total={filteredItems.length}
          onChange={changePage}
        />
      )}
    </div>
  )
}
