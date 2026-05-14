'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { NewsItem, TabRange } from '@/types'

const TAB_OPTIONS: { value: TabRange; label: string }[] = [
  { value: 'today',  label: '24 小時' },
  { value: '3days',  label: '3 天'   },
  { value: 'week',   label: '本週'   },
  { value: 'month',  label: '30 天'  },
]

const COL_OPTIONS = [
  { value: 'tw',   label: '台灣' },
  { value: 'intl', label: '國際' },
]

const CAT_OPTIONS = [
  { value: '',         label: '全部分類' },
  { value: 'politics', label: '政治' },
  { value: 'society',  label: '社會' },
  { value: 'life',     label: '民生' },
]

const LIMIT = 50

function sentimentDot(s?: string) {
  if (s === 'positive') return 'bg-green-400'
  if (s === 'negative') return 'bg-red-400'
  return 'bg-gray-300'
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ArchivePage() {
  const [tab,   setTab]   = useState<TabRange>('week')
  const [col,   setCol]   = useState('tw')
  const [cat,   setCat]   = useState('')
  const [q,     setQ]     = useState('')
  const [input, setInput] = useState('')

  const [items,      setItems]      = useState<NewsItem[]>([])
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(async (p: number, resetItems = false) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    try {
      const params = new URLSearchParams({
        tab, col, page: String(p), limit: String(LIMIT),
        ...(q   ? { q }   : {}),
        ...(cat ? { cat } : {}),
      })
      const r = await fetch(`/api/news?${params}`, { signal: ctrl.signal })
      if (!r.ok) return
      const data = await r.json()
      setItems(prev => resetItems ? (data.items ?? []) : [...prev, ...(data.items ?? [])])
      setPage(data.page ?? p)
      setTotalPages(data.totalPages ?? 1)
      setTotal(data.total ?? 0)
    } catch {
      // aborted or network error
    } finally {
      setLoading(false)
    }
  }, [tab, col, q, cat])

  // Reset and fetch page 1 whenever filters change
  useEffect(() => {
    fetchPage(1, true)
  }, [fetchPage])

  const handleSearch = () => {
    setQ(input.trim())
    setPage(1)
  }

  const loadMore = () => {
    if (page < totalPages && !loading) fetchPage(page + 1)
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DC] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href="/" className="text-[#5B7FA6] hover:text-[#3D5A7A] text-sm font-medium flex items-center gap-1.5">
            ← 回首頁
          </Link>
          <div className="h-4 w-px bg-[#E8E4DC]" />
          <h1 className="text-sm font-semibold text-[#2C2C2C]">新聞存檔</h1>
          {total > 0 && (
            <span className="text-xs text-[#888888]">共 {total} 則</span>
          )}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Filters */}
        <div className="bg-white border border-[#E8E4DC] rounded-xl p-4 space-y-3">
          {/* Search */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="搜尋標題、來源關鍵字…"
              className="flex-1 text-sm border border-[#E8E4DC] rounded-lg px-3 py-2 outline-none focus:border-[#5B7FA6] bg-[#F7F5F0] placeholder:text-[#BBBBBB]"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-[#5B7FA6] text-white text-sm font-medium rounded-lg hover:bg-[#4A6E95] transition-colors"
            >
              搜尋
            </button>
            {q && (
              <button
                onClick={() => { setInput(''); setQ('') }}
                className="px-3 py-2 text-xs text-[#888888] border border-[#E8E4DC] rounded-lg hover:bg-[#F7F5F0]"
              >
                清除
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-4 text-xs">
            {/* 時間範圍 */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#888888]">時間</span>
              {TAB_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setTab(o.value)}
                  className={clsx('px-2.5 py-0.5 rounded-full font-medium transition-colors',
                    tab === o.value ? 'bg-[#5B7FA6] text-white' : 'bg-[#EFECE5] text-[#555555] hover:text-[#2C2C2C]'
                  )}>
                  {o.label}
                </button>
              ))}
            </div>

            {/* 欄位 */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#888888]">來源</span>
              {COL_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setCol(o.value)}
                  className={clsx('px-2.5 py-0.5 rounded-full font-medium transition-colors',
                    col === o.value ? 'bg-[#5B7FA6] text-white' : 'bg-[#EFECE5] text-[#555555] hover:text-[#2C2C2C]'
                  )}>
                  {o.label}
                </button>
              ))}
            </div>

            {/* 分類 */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#888888]">分類</span>
              {CAT_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setCat(o.value)}
                  className={clsx('px-2.5 py-0.5 rounded-full font-medium transition-colors',
                    cat === o.value ? 'bg-[#5B7FA6] text-white' : 'bg-[#EFECE5] text-[#555555] hover:text-[#2C2C2C]'
                  )}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {q && (
          <p className="text-xs text-[#888888]">
            搜尋「<span className="text-[#2C2C2C] font-medium">{q}</span>」，找到 {total} 則
          </p>
        )}

        <div className="space-y-2">
          {items.map(item => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 bg-white border border-[#E8E4DC] rounded-lg px-4 py-3 hover:border-[#5B7FA6]/40 hover:bg-[#F7F9FC] transition-colors group"
            >
              <span className={clsx('flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2', sentimentDot(item.sentiment))} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#2C2C2C] leading-snug group-hover:text-[#3D5A7A]">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[11px] text-[#888888]">{item.source}</span>
                  <span className="text-[11px] text-[#BBBBBB]">·</span>
                  <span className="text-[11px] text-[#888888]">{formatDate(item.publishedAt)}</span>
                  {item.category && item.category !== 'all' && (
                    <>
                      <span className="text-[11px] text-[#BBBBBB]">·</span>
                      <span className="text-[11px] text-[#5B7FA6]">
                        {{ politics: '政治', society: '社會', life: '民生', entertainment: '民生', finance: '民生', tech: '民生' }[item.category] ?? item.category}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </a>
          ))}

          {items.length === 0 && !loading && (
            <div className="text-center py-16 text-sm text-[#888888]">
              {q ? '找不到符合的新聞' : '此條件無新聞資料'}
            </div>
          )}
        </div>

        {/* Load more */}
        {page < totalPages && (
          <div className="flex justify-center pt-2">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-6 py-2.5 bg-white border border-[#E8E4DC] rounded-lg text-sm text-[#5B7FA6] font-medium hover:bg-[#EBF0F7] hover:border-[#5B7FA6]/40 transition-colors disabled:opacity-50"
            >
              {loading ? '載入中…' : `載入更多（第 ${page + 1} / ${totalPages} 頁）`}
            </button>
          </div>
        )}

        {loading && items.length === 0 && (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-white border border-[#E8E4DC] rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-[#CCCCCC] pb-4">
          存檔保留最近 30 天 · 每欄最多 800 則
        </p>
      </main>
    </div>
  )
}
