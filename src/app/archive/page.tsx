'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import clsx from 'clsx'
import { NewsItem, TabRange } from '@/types'
import { HistorySnapshot } from '@/lib/history'

const TAB_OPTIONS: { value: TabRange; label: string }[] = [
  { value: 'today', label: '24 小時' },
  { value: '3days', label: '3 天'   },
  { value: 'week',  label: '本週'   },
  { value: 'month', label: '30 天'  },
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

const SOURCE_OPTIONS = [
  { value: '', label: '所有媒體' },
  { value: '自由時報', label: '自由時報' },
  { value: 'ETtoday',  label: 'ETtoday'  },
  { value: '新頭殼',   label: '新頭殼'   },
  { value: '公視',     label: '公視新聞'  },
  { value: '中央社',   label: '中央社'   },
  { value: '經濟日報', label: '經濟日報' },
  { value: '風傳媒',   label: '風傳媒'   },
  { value: 'Yahoo',    label: 'Yahoo 奇摩'},
  { value: 'Google News', label: 'Google News' },
]

const PAGE_SIZE = 30

function sentimentDot(s?: string) {
  if (s === 'positive') return 'bg-green-400'
  if (s === 'negative') return 'bg-red-400'
  return 'bg-gray-300'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Pagination ──────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onChange }: {
  page: number; totalPages: number; onChange: (p: number) => void
}) {
  const [jumpVal, setJumpVal] = useState('')

  function handleJump(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(jumpVal)
    if (!isNaN(n) && n >= 1 && n <= totalPages) onChange(n)
    setJumpVal('')
  }

  function pageNumbers(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '…')[] = []
    const add = (n: number) => { if (!pages.includes(n)) pages.push(n) }
    add(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) add(i)
    if (page < totalPages - 2) pages.push('…')
    add(totalPages)
    return pages
  }

  const btn = 'min-w-[32px] h-8 px-1.5 rounded-md text-xs font-medium transition-colors'

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1}
          className={clsx(btn, 'px-2.5 border border-[#E8E4DC] text-[#5B7FA6] hover:bg-[#EBF0F7] disabled:opacity-30 disabled:cursor-not-allowed')}>←</button>
        {pageNumbers().map((n, i) =>
          n === '…'
            ? <span key={`e${i}`} className="text-xs text-[#AAAAAA] px-0.5">…</span>
            : <button key={n} onClick={() => onChange(n as number)}
                className={clsx(btn, n === page
                  ? 'bg-[#5B7FA6] text-white'
                  : 'border border-[#E8E4DC] text-[#555555] hover:bg-[#EBF0F7]')}>
                {n}
              </button>
        )}
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages}
          className={clsx(btn, 'px-2.5 border border-[#E8E4DC] text-[#5B7FA6] hover:bg-[#EBF0F7] disabled:opacity-30 disabled:cursor-not-allowed')}>→</button>
      </div>
      {totalPages > 5 && (
        <form onSubmit={handleJump} className="flex items-center gap-1.5 text-xs text-[#888888]">
          <span>跳至</span>
          <input type="number" min={1} max={totalPages} value={jumpVal}
            onChange={e => setJumpVal(e.target.value)}
            className="w-14 h-7 px-2 text-xs border border-[#E8E4DC] rounded-md text-center focus:outline-none focus:border-[#5B7FA6]"
            placeholder="頁碼" />
          <button type="submit"
            className="h-7 px-2.5 text-xs border border-[#E8E4DC] rounded-md text-[#5B7FA6] hover:bg-[#EBF0F7] transition-colors">Go</button>
        </form>
      )}
    </div>
  )
}

// ─── AI History panel ────────────────────────────────────────────────────────

interface HistoryEntry { ts: number; generatedAt: string; tab: string }
const TAB_LABELS: Record<string, string> = {
  today: '24 小時', '3days': '3 天', week: '本週', month: '30 天',
}

function HistoryPanel() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<HistorySnapshot | null>(null)
  const [loadingSnap, setLoadingSnap] = useState(false)

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(d => setEntries(d.entries ?? [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const loadSnapshot = async (ts: number) => {
    setLoadingSnap(true)
    try { const r = await fetch(`/api/history?ts=${ts}`); if (r.ok) setSelected(await r.json()) }
    finally { setLoadingSnap(false) }
  }

  if (loading) return <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-white border border-[#E8E4DC] rounded-lg animate-pulse" />)}</div>
  if (entries.length === 0) return <div className="text-center py-16 text-sm text-[#888888]">尚無歷史分析紀錄。每次 AI 重新分析後，資料會自動記錄在這裡。</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        {entries.map(e => (
          <button key={e.ts} onClick={() => loadSnapshot(e.ts)}
            className={clsx('w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors',
              selected && (selected as HistorySnapshot & { _ts?: number })._ts === e.ts
                ? 'border-[#5B7FA6] bg-[#EBF0F7] text-[#3D5A7A]'
                : 'border-[#E8E4DC] bg-white hover:border-[#5B7FA6]/40 hover:bg-[#F7F9FC]')}>
            <div className="font-medium text-[#2C2C2C]">{formatDate(e.generatedAt)}</div>
            <div className="text-[11px] text-[#888888] mt-0.5">{TAB_LABELS[e.tab] ?? e.tab} 時段分析</div>
          </button>
        ))}
      </div>
      <div className="md:col-span-2">
        {loadingSnap && <div className="h-40 bg-white border border-[#E8E4DC] rounded-xl animate-pulse" />}
        {!loadingSnap && !selected && <div className="flex items-center justify-center h-40 text-sm text-[#AAAAAA] border border-dashed border-[#E8E4DC] rounded-xl">← 選取左側紀錄以查看詳情</div>}
        {!loadingSnap && selected && (
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-5 space-y-4">
            <p className="text-xs text-[#888888]">分析時間：{formatDate(selected.generatedAt)}　時段：{TAB_LABELS[selected.tab] ?? selected.tab}</p>
            {selected.summary?.overview && <div><p className="text-xs font-semibold text-[#5B7FA6] mb-1">整體輿情</p><p className="text-sm text-[#2C2C2C] leading-relaxed">{selected.summary.overview}</p></div>}
            {selected.summary?.topics && selected.summary.topics.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#5B7FA6] mb-1.5">五大議題</p>
                <div className="flex flex-wrap gap-1.5">{selected.summary.topics.map((t, i) => <span key={i} className="text-xs px-2 py-0.5 bg-[#EBF0F7] text-[#3D5A7A] rounded-full">{t}</span>)}</div>
              </div>
            )}
            {(() => {
              const items = selected.summary?.dynamics?.length ? selected.summary.dynamics : [...(selected.summary?.brewing ?? []), ...(selected.summary?.upcoming ?? [])]
              if (!items.length) return null
              return <div><p className="text-xs font-semibold text-[#D4874A] mb-1.5">動向 & 升溫預測</p><ul className="space-y-1">{items.map((a, i) => <li key={i} className="text-sm text-[#2C2C2C] flex gap-2"><span className="text-[#D4874A] flex-shrink-0">→</span>{a}</li>)}</ul></div>
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── News search tab ─────────────────────────────────────────────────────────

type PageTab = 'news' | 'history'

function ArchiveContent() {
  const searchParams = useSearchParams()
  const initQ = searchParams.get('q') ?? ''

  const [pageTab, setPageTab] = useState<PageTab>('news')
  const [tab,   setTab]   = useState<TabRange>('today')
  const [col,   setCol]   = useState('tw')
  const [cat,   setCat]   = useState('')
  const [src,   setSrc]   = useState('')
  const [q,     setQ]     = useState(initQ)
  const [input, setInput] = useState(initQ)

  const [items,      setItems]      = useState<NewsItem[]>([])
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(false)

  const topRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(async (p: number) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    try {
      const mergedQ = [q, src].filter(Boolean).join(' ')
      const params = new URLSearchParams({
        tab, col, page: String(p), limit: String(PAGE_SIZE),
        ...(mergedQ ? { q: mergedQ } : {}),
        ...(cat     ? { cat }        : {}),
      })
      const r = await fetch(`/api/news?${params}`, { signal: ctrl.signal })
      if (!r.ok) return
      const data = await r.json()
      setItems(data.items ?? [])
      setPage(data.page ?? p)
      setTotalPages(data.totalPages ?? 1)
      setTotal(data.total ?? 0)
    } catch { /* aborted */ } finally { setLoading(false) }
  }, [tab, col, q, cat, src])

  useEffect(() => { if (pageTab === 'news') fetchPage(1) }, [fetchPage, pageTab])

  const handleSearch = () => { setQ(input.trim()); setPage(1) }

  const changePage = (p: number) => {
    fetchPage(p)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const hasFilter = q !== '' || src !== '' || cat !== '' || tab !== 'today' || col !== 'tw'

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      <div className="bg-white border-b border-[#E8E4DC] sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link href="/" className="text-[#5B7FA6] hover:text-[#3D5A7A] text-sm font-medium flex items-center gap-1.5 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            首頁
          </Link>
          <div className="h-4 w-px bg-[#E8E4DC]" />
          <h1 className="text-sm font-semibold text-[#2C2C2C]">新聞搜尋</h1>
          {pageTab === 'news' && total > 0 && (
            <span className="text-xs text-[#888888] ml-auto">共 <strong className="text-[#2C2C2C]">{total}</strong> 則</span>
          )}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-4" ref={topRef}>
        <div className="flex gap-2 border-b border-[#E8E4DC]">
          {([
            { value: 'news',    label: '新聞搜尋'   },
            { value: 'history', label: 'AI 歷史分析' },
          ] as { value: PageTab; label: string }[]).map(t => (
            <button key={t.value} onClick={() => setPageTab(t.value)}
              className={clsx('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                pageTab === t.value ? 'border-[#5B7FA6] text-[#5B7FA6]' : 'border-transparent text-[#888888] hover:text-[#2C2C2C]')}>
              {t.label}
            </button>
          ))}
        </div>

        {pageTab === 'history' && <HistoryPanel />}

        {pageTab === 'news' && (
          <>
            {/* Search + filter card */}
            <div className="bg-white border border-[#E8E4DC] rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAAAAA]" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input type="text" value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="輸入關鍵字、人名、事件…"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#E8E4DC] rounded-lg outline-none focus:border-[#5B7FA6] focus:ring-1 focus:ring-[#5B7FA6]/20 bg-[#F7F5F0] placeholder:text-[#BBBBBB] transition-colors"
                    autoFocus />
                </div>
                <button onClick={handleSearch}
                  className="px-5 py-2.5 bg-[#5B7FA6] text-white text-sm font-medium rounded-lg hover:bg-[#4A6E95] transition-colors whitespace-nowrap">
                  搜尋
                </button>
                {hasFilter && (
                  <button onClick={() => { setInput(''); setQ(''); setSrc(''); setCat(''); setTab('today'); setCol('tw') }}
                    className="px-3 py-2 text-xs text-[#888888] border border-[#E8E4DC] rounded-lg hover:bg-[#F7F5F0] whitespace-nowrap transition-colors">
                    清除
                  </button>
                )}
              </div>

              <div className="space-y-2 pt-1 border-t border-[#F0EDE6]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-[#AAAAAA] w-8 flex-shrink-0">時間</span>
                  {TAB_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setTab(o.value)}
                      className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
                        tab === o.value ? 'bg-[#5B7FA6] text-white' : 'bg-[#EFECE5] text-[#555555] hover:text-[#2C2C2C]')}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-[#AAAAAA] w-8 flex-shrink-0">欄位</span>
                  {COL_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setCol(o.value)}
                      className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
                        col === o.value ? 'bg-[#5B7FA6] text-white' : 'bg-[#EFECE5] text-[#555555] hover:text-[#2C2C2C]')}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-[#AAAAAA] w-8 flex-shrink-0">分類</span>
                  {CAT_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setCat(o.value)}
                      className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
                        cat === o.value ? 'bg-[#5B7FA6] text-white' : 'bg-[#EFECE5] text-[#555555] hover:text-[#2C2C2C]')}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-[#AAAAAA] w-8 flex-shrink-0">媒體</span>
                  {SOURCE_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setSrc(o.value)}
                      className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
                        src === o.value ? 'bg-[#5B7FA6] text-white' : 'bg-[#EFECE5] text-[#555555] hover:text-[#2C2C2C]')}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {(q || src) && (
              <p className="text-xs text-[#888888] px-1">
                {[q && `「${q}」`, src && `媒體：${src}`].filter(Boolean).join('・')}
                <span className="ml-1">找到 <strong className="text-[#2C2C2C]">{total}</strong> 則</span>
              </p>
            )}

            <div className="space-y-2">
              {loading && items.length === 0 && [...Array(8)].map((_, i) => (
                <div key={i} className="h-16 bg-white border border-[#E8E4DC] rounded-lg animate-pulse" />
              ))}
              {!loading && items.length === 0 && (
                <div className="text-center py-16 space-y-2">
                  <p className="text-sm text-[#888888]">{q || src ? '找不到符合的新聞' : '此條件無新聞資料'}</p>
                  {(q || src) && <p className="text-xs text-[#AAAAAA]">試試縮短關鍵字，或調整時間範圍</p>}
                </div>
              )}
              {items.map(item => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                  className="flex gap-3 bg-white border border-[#E8E4DC] rounded-xl px-4 py-3 hover:border-[#5B7FA6]/40 hover:bg-[#F7F9FC] transition-colors group">
                  <span className={clsx('flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2', sentimentDot(item.sentiment))} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#2C2C2C] leading-snug group-hover:text-[#3D5A7A]">{item.title}</p>
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
                  <svg className="flex-shrink-0 w-3.5 h-3.5 text-[#CCCCCC] group-hover:text-[#5B7FA6] mt-1 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              ))}
            </div>

            {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={changePage} />}

            <p className="text-center text-[11px] text-[#CCCCCC] pb-4">
              資料保留最近 24 小時・每次手動整理可更新最新資料
            </p>
          </>
        )}
      </main>
    </div>
  )
}

export default function ArchivePage() {
  return <Suspense><ArchiveContent /></Suspense>
}
