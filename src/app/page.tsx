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
}

export default function HomePage() {
  const [tab, setTab] = useState<TabRange>('today')
  const [state, setState] = useState<PageState>(INITIAL_STATE)
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (activeTab: TabRange, force = false) => {
    const qs = force ? '&force=1' : ''
    setState(prev => ({
      ...prev,
      loading: { tw: true, intl: true, summary: true, keywords: true, hotlist: true },
      error: {},
    }))

    // Fetch news first so hotlist can reuse the cache
    const [twRes, intlRes] = await Promise.allSettled([
      fetch(`/api/news?tab=${activeTab}&col=tw${qs}`).then(r => r.json()),
      fetch(`/api/news?tab=${activeTab}&col=intl${qs}`).then(r => r.json()),
    ])

    const [summaryRes, keywordsRes, hotlistRes] = await Promise.allSettled([
      fetch(`/api/summary?tab=${activeTab}${qs}`).then(r => r.json()),
      fetch(`/api/keywords?tab=${activeTab}${qs}`).then(r => r.json()),
      fetch(`/api/hotlist?tab=${activeTab}${qs}`).then(r => r.json()),
    ])

    setState(prev => ({
      ...prev,
      twNews: twRes.status === 'fulfilled' ? (twRes.value.items ?? []) : [],
      intlNews: intlRes.status === 'fulfilled' ? (intlRes.value.items ?? []) : [],
      summary:
        summaryRes.status === 'fulfilled' ? (summaryRes.value.data ?? null) : null,
      keywords:
        keywordsRes.status === 'fulfilled' ? (keywordsRes.value.keywords ?? []) : [],
      hotlist:
        hotlistRes.status === 'fulfilled'
          ? {
              tw: hotlistRes.value.tw ?? EMPTY_HOTDATA,
              intl: hotlistRes.value.intl ?? EMPTY_HOTDATA,
            }
          : { tw: EMPTY_HOTDATA, intl: EMPTY_HOTDATA },
      updatedAt:
        twRes.status === 'fulfilled' ? twRes.value.updatedAt : undefined,
      loading: { tw: false, intl: false, summary: false, keywords: false, hotlist: false },
      error: {
        tw:
          twRes.status === 'rejected'
            ? '台灣新聞暫時無法載入，請稍後再試'
            : undefined,
        intl:
          intlRes.status === 'rejected'
            ? '國際新聞暫時無法載入，請稍後再試'
            : undefined,
      },
    }))
  }, [])

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
            selectedKeyword={selectedKeyword}
          />
          <div className="md:border-l md:border-[#E8E4DC] md:pl-8">
            <NewsColumn
              title="國際視角"
              subtitle="Google News 國際 · GDELT 全球媒體"
              items={state.intlNews}
              loading={state.loading.intl}
              error={state.error.intl}
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
