'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import TabBar from '@/components/TabBar'
import SummaryBanner from '@/components/SummaryBanner'
import KeywordCloud from '@/components/KeywordCloud'
import HotList from '@/components/HotList'
import NewsColumn from '@/components/NewsColumn'
import { TabRange, NewsItem } from '@/types'

interface HotData {
  topics: string[]
  keywords: string[]
}

interface PageState {
  twNews: NewsItem[]
  intlNews: NewsItem[]
  summary: string
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

const EMPTY_HOTDATA: HotData = { topics: [], keywords: [] }

const INITIAL_STATE: PageState = {
  twNews: [],
  intlNews: [],
  summary: '',
  keywords: [],
  hotlist: { tw: EMPTY_HOTDATA, intl: EMPTY_HOTDATA },
  loading: { tw: true, intl: true, summary: true, keywords: true, hotlist: true },
  error: {},
}

export default function HomePage() {
  const [tab, setTab] = useState<TabRange>('today')
  const [state, setState] = useState<PageState>(INITIAL_STATE)

  const fetchData = useCallback(async (activeTab: TabRange) => {
    setState(prev => ({
      ...prev,
      loading: { tw: true, intl: true, summary: true, keywords: true, hotlist: true },
      error: {},
    }))

    // Fetch news first so hotlist can reuse the cache
    const [twRes, intlRes] = await Promise.allSettled([
      fetch(`/api/news?tab=${activeTab}&col=tw`).then(r => r.json()),
      fetch(`/api/news?tab=${activeTab}&col=intl`).then(r => r.json()),
    ])

    const [summaryRes, keywordsRes, hotlistRes] = await Promise.allSettled([
      fetch(`/api/summary?tab=${activeTab}`).then(r => r.json()),
      fetch(`/api/keywords?tab=${activeTab}`).then(r => r.json()),
      fetch(`/api/hotlist?tab=${activeTab}`).then(r => r.json()),
    ])

    setState(prev => ({
      ...prev,
      twNews: twRes.status === 'fulfilled' ? (twRes.value.items ?? []) : [],
      intlNews: intlRes.status === 'fulfilled' ? (intlRes.value.items ?? []) : [],
      summary:
        summaryRes.status === 'fulfilled' ? (summaryRes.value.text ?? '') : '',
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

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      <Header updatedAt={state.updatedAt} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* AI 輿情摘要 */}
        <SummaryBanner text={state.summary} loading={state.loading.summary} />

        {/* 熱門排行 */}
        <HotList
          tw={state.hotlist.tw}
          intl={state.hotlist.intl}
          loading={state.loading.hotlist}
        />

        {/* 議題標籤 */}
        <section>
          <h2 className="text-xs font-medium text-[#888888] uppercase tracking-widest mb-3">
            本期議題焦點
          </h2>
          <KeywordCloud keywords={state.keywords} loading={state.loading.keywords} />
        </section>

        {/* Tab 切換 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <TabBar active={tab} onChange={setTab} />
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
          />
          <div className="md:border-l md:border-[#E8E4DC] md:pl-8">
            <NewsColumn
              title="國際視角"
              subtitle="Google News 國際 · GDELT 全球媒體"
              items={state.intlNews}
              loading={state.loading.intl}
              error={state.error.intl}
            />
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 mt-4 border-t border-[#E8E4DC]">
        <p className="text-xs text-[#888888] text-center leading-relaxed">
          資料來源：聯合新聞網・自由時報・中時電子報・ETtoday・TVBS・民視新聞・風傳媒・中央社・三立新聞・Google News・GDELT・NewsAPI
        </p>
      </footer>
    </div>
  )
}
