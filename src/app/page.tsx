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

export default function HomePage() {
  const [state, setState] = useState<PageState>(INITIAL_STATE)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState<string>('正在抓取新聞…')

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
    setLoadingLabel('正在抓取最新新聞…')

    // Fetch tw + intl news in parallel; merge into one list
    const [twData, intlData] = await Promise.all([
      safeFetch(`/api/news?tab=today&col=tw${qs}`),
      safeFetch(`/api/news?tab=today&col=intl${qs}`),
    ])

    setLoadingLabel('AI 正在分析輿情中…')

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
    setLoadingLabel('正在抓取新聞…')
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
  const isFirstLoad = isLoading && state.allNews.length === 0

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* First-load overlay — big spinner + patience message */}
      {isFirstLoad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7F5F0]/85 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E8E4DC] px-10 py-12 flex flex-col items-center gap-6 max-w-sm text-center mx-4">
            <div className="w-20 h-20 rounded-full border-[5px] border-[#E8E4DC] border-t-[#5B7FA6] animate-spin" />
            <div className="space-y-2">
              <p className="text-base font-semibold text-[#2C2C2C]">{loadingLabel}</p>
              <p className="text-sm text-[#888888] leading-relaxed">
                新聞量龐大，依效能約需<br />
                <strong className="text-[#5B7FA6]">30 秒–數分鐘不等</strong>，請耐心等候
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Refresh toast — shown when manually refreshing with existing data */}
      {refreshing && !isFirstLoad && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-white rounded-full shadow-lg border border-[#E8E4DC] px-4 py-2 flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-full border-2 border-[#E8E4DC] border-t-[#5B7FA6] animate-spin flex-shrink-0" />
            <span className="text-xs font-medium text-[#5B7FA6]">更新中，請稍候…</span>
          </div>
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
