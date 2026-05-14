'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import TabBar from '@/components/TabBar'
import SummaryBanner from '@/components/SummaryBanner'
import KeywordCloud from '@/components/KeywordCloud'
import HotList from '@/components/HotList'
import NewsColumn from '@/components/NewsColumn'
import { TabRange, NewsItem, SummaryData } from '@/types'

interface HotData {
  topics: string[]
  keywords: string[]
  people: string[]
}

interface PageState {
  twNews: NewsItem[]
  intlNews: NewsItem[]
  summary: SummaryData | null
  keywords: Array<{ word: string; count: number }>
  hotlist: { tw: HotData; intl: HotData }
  updatedAt?: string
  loading: {
    tw: boolean
    intl: boolean
    summary: boolean
    keywords: boolean
    hotlist: boolean
  }
  error: { tw?: string; intl?: string }
  building: { tw: boolean; intl: boolean }
}

const EMPTY_HOTDATA: HotData = { topics: [], keywords: [], people: [] }

const INITIAL_STATE: PageState = {
  twNews: [],
  intlNews: [],
  summary: null,
  keywords: [],
  hotlist: { tw: EMPTY_HOTDATA, intl: EMPTY_HOTDATA },
  loading: { tw: true, intl: true, summary: true, keywords: true, hotlist: true },
  error: {},
  building: { tw: false, intl: false },
}

export default function HomePage() {
  const [tab, setTab] = useState<TabRange>('today')
  const [state, setState] = useState<PageState>(INITIAL_STATE)
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const safeFetch = useCallback(async (url: string) => {
    try {
      const r = await fetch(url)
      if (!r.ok) return { _status: r.status }
      return r.json()
    } catch {
      return { _status: 0 }
    }
  }, [])

  const fetchData = useCallback(async (activeTab: TabRange, force = false) => {
    const qs = force ? '&force=1' : ''
    setState(prev => ({
      ...prev,
      loading: { tw: true, intl: true, summary: true, keywords: true, hotlist: true },
      error: {},
      building: { tw: false, intl: false },
    }))

    // Fetch news first so hotlist/keywords can reuse the populated cache
    const [twData, intlData] = await Promise.all([
      safeFetch(`/api/news?tab=${activeTab}&col=tw${qs}`),
      safeFetch(`/api/news?tab=${activeTab}&col=intl${qs}`),
    ])

    const [summaryData, keywordsData, hotlistData] = await Promise.all([
      safeFetch(`/api/summary?tab=${activeTab}${qs}`),
      safeFetch(`/api/keywords?tab=${activeTab}${qs}`),
      safeFetch(`/api/hotlist?tab=${activeTab}${qs}`),
    ])

    const twItems: NewsItem[]   = twData?.items   ?? []
    const intlItems: NewsItem[] = intlData?.items  ?? []
    const twFailed   = twData?._status !== undefined
    const intlFailed = intlData?._status !== undefined

    setState(prev => ({
      ...prev,
      twNews: twItems,
      intlNews: intlItems,
      summary:   summaryData?.data    ?? null,
      keywords:  keywordsData?.keywords ?? [],
      hotlist: {
        tw:   hotlistData?.tw   ?? EMPTY_HOTDATA,
        intl: hotlistData?.intl ?? EMPTY_HOTDATA,
      },
      updatedAt: twData?.updatedAt,
      loading: { tw: false, intl: false, summary: false, keywords: false, hotlist: false },
      // building = server responded but store is empty (still fetching feeds)
      building: {
        tw:   !twFailed && twItems.length === 0,
        intl: !intlFailed && intlItems.length === 0,
      },
      error: {
        tw:   twFailed   ? '台灣新聞暫時無法載入，請稍後再試' : undefined,
        intl: intlFailed ? '國際新聞暫時無法載入，請稍後再試' : undefined,
      },
    }))
  }, [safeFetch])

  useEffect(() => {
    fetchData(tab)
  }, [tab, fetchData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData(tab, true)
    setRefreshing(false)
  }, [tab, fetchData])

  const handleTabChange = (newTab: TabRange) => {
    setSelectedKeyword(null)
    setTab(newTab)
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
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
          intl={state.hotlist.intl}
          loading={state.loading.hotlist}
          twItems={state.twNews}
          intlItems={state.intlNews}
        />

        {/* 議題標籤 */}
        <section>
          <h2 className="text-xs font-medium text-[#888888] uppercase tracking-widest mb-3">
            本期議題焦點
          </h2>
          <KeywordCloud
            keywords={state.keywords}
            loading={state.loading.keywords}
            selectedWord={selectedKeyword}
            onSelect={setSelectedKeyword}
          />
        </section>

        {/* Tab 切換 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <TabBar active={tab} onChange={handleTabChange} />
          <span className="text-xs text-[#888888]">
            {tab === 'today' ? '過去 24 小時' : ''}資料每 6 小時更新一次
          </span>
        </div>

        {/* 雙欄新聞 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <NewsColumn
            title="台灣輿情"
            subtitle="台灣主流媒體 · Google News · NewsAPI"
            items={state.twNews}
            loading={state.loading.tw}
            error={state.error.tw}
            building={state.building.tw}
            selectedKeyword={selectedKeyword}
          />
          <div className="md:border-l md:border-[#E8E4DC] md:pl-8">
            <NewsColumn
              title="國際視角"
              subtitle="Google News 國際 · GDELT 全球媒體"
              items={state.intlNews}
              loading={state.loading.intl}
              error={state.error.intl}
              building={state.building.intl}
              selectedKeyword={selectedKeyword}
            />
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 mt-4 border-t border-[#E8E4DC] space-y-2">
        <p className="text-xs text-[#888888] text-center leading-relaxed">
          資料來源：聯合新聞網・自由時報・中時電子報・ETtoday・TVBS・民視新聞・風傳媒・中央社・三立新聞・Google News・GDELT・NewsAPI・Mediastack・GNews
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
