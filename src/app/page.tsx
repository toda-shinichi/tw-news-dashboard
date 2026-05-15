'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import SummaryBanner from '@/components/SummaryBanner'
import HotList from '@/components/HotList'
import NewsColumn from '@/components/NewsColumn'
import { NewsItem, SummaryData } from '@/types'

interface HotData {
  topics: string[]
  keywords: string[]
  people: string[]
}

interface PageState {
  allNews: NewsItem[]
  summary: SummaryData | null
  hotlist: { tw: HotData }
  updatedAt?: string
  loading: {
    news: boolean
    summary: boolean
    hotlist: boolean
  }
  error: { news?: string }
  building: boolean
}

const EMPTY_HOTDATA: HotData = { topics: [], keywords: [], people: [] }

const INITIAL_STATE: PageState = {
  allNews: [],
  summary: null,
  hotlist: { tw: EMPTY_HOTDATA },
  loading: { news: true, summary: true, hotlist: true },
  error: {},
  building: false,
}

interface Progress {
  pct: number
  label: string
}

export default function HomePage() {
  const [state, setState] = useState<PageState>(INITIAL_STATE)
  const [refreshing, setRefreshing] = useState(false)
  const [progress, setProgress] = useState<Progress | null>({ pct: 5, label: '正在抓取新聞…' })

  const safeFetch = useCallback(async (url: string) => {
    try {
      const r = await fetch(url)
      if (!r.ok) return { _status: r.status }
      return r.json()
    } catch {
      return { _status: 0 }
    }
  }, [])

  const fetchData = useCallback(async (force = false) => {
    const qs = force ? '&force=1' : ''
    setState(prev => ({
      ...prev,
      loading: { news: true, summary: true, hotlist: true },
      error: {},
      building: false,
    }))
    setProgress({ pct: 10, label: '正在抓取最新新聞…' })

    // Fetch tw + intl news in parallel; merge into one list
    const [twData, intlData] = await Promise.all([
      safeFetch(`/api/news?tab=today&col=tw${qs}`),
      safeFetch(`/api/news?tab=today&col=intl${qs}`),
    ])

    setProgress({ pct: 55, label: 'AI 正在分析輿情…' })

    const [summaryData, hotlistData] = await Promise.all([
      safeFetch(`/api/summary?tab=today${qs}`),
      safeFetch(`/api/hotlist?tab=today${qs}`),
    ])

    const twItems: NewsItem[]   = twData?.items   ?? []
    const intlItems: NewsItem[] = intlData?.items  ?? []
    const newsFailed = twData?._status !== undefined && intlData?._status !== undefined

    // intl first so intl version wins when same story appears in both columns
    const rawAll = [...intlItems, ...twItems].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    const seenTitles = new Set<string>()
    const allItems: NewsItem[] = rawAll.filter(item => {
      const key = item.title.slice(0, 25)
      if (seenTitles.has(key)) return false
      seenTitles.add(key)
      return true
    })

    setState(prev => ({
      ...prev,
      allNews: allItems,
      summary:  summaryData?.data     ?? null,
      hotlist:  { tw: hotlistData?.tw ?? EMPTY_HOTDATA },
      updatedAt: twData?.updatedAt,
      loading: { news: false, summary: false, hotlist: false },
      building: !newsFailed && allItems.length === 0,
      error: { news: newsFailed ? '新聞暫時無法載入，請稍後再試' : undefined },
    }))
    setProgress({ pct: 100, label: '載入完成' })
    setTimeout(() => setProgress(null), 800)
  }, [safeFetch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData(true)
    setRefreshing(false)
  }, [fetchData])

  const isLoading = Object.values(state.loading).some(Boolean)
  const newsLoading = state.loading.news

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Top progress bar */}
      {(progress || isLoading) && (
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
          <div className="h-[3px] bg-[#E8E4DC]">
            <div
              className="h-full bg-[#5B7FA6] transition-all duration-500 ease-out"
              style={{ width: `${progress?.pct ?? 5}%` }}
            />
          </div>
          {progress && (
            <div className="flex justify-center mt-1.5">
              <span className="text-[11px] font-medium text-[#5B7FA6] bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-[#E8E4DC]">
                {progress.label}
              </span>
            </div>
          )}
        </div>
      )}

      <Header
        updatedAt={state.updatedAt}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* AI 輿情摘要 */}
        <SummaryBanner data={state.summary} loading={state.loading.summary} />

        {/* 熱門排行 */}
        <HotList
          tw={state.hotlist.tw}
          loading={state.loading.hotlist}
          tab="today"
        />

        {/* 單欄新聞（台灣 + 國際合併，可用「國際」分類篩選） */}
        <NewsColumn
          title="輿情一覽"
          subtitle="台灣主流媒體 · Google News · NewsAPI · GDELT · Mediastack · GNews"
          items={state.allNews}
          loading={newsLoading}
          error={state.error.news}
          building={state.building}
        />
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 mt-4 border-t border-[#E8E4DC] space-y-2">
        <p className="text-xs text-[#888888] text-center leading-relaxed">
          資料來源：自由時報・聯合新聞網・ETtoday・新頭殼・公視新聞・風傳媒・中央社・iThome・TechNews・經濟日報・Google News・GDELT・NewsAPI・Mediastack・GNews
        </p>
        <p className="text-xs text-[#AAAAAA] text-center">
          © {new Date().getFullYear()} 子桓 Huan Hsu｜
          <a href="mailto:huanhsuai@gmail.com" className="hover:text-[#5B7FA6] transition-colors">
            huanhsuai@gmail.com
          </a>
          ・本站內容僅供資訊參考，新聞著作權歸各原始媒體所有
        </p>
      </footer>
    </div>
  )
}
