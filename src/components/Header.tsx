'use client'

import { useState } from 'react'
import Link from 'next/link'

const SOURCES = [
  {
    group: '台灣媒體',
    items: ['自由時報', '聯合新聞網', '中時電子報', 'ETtoday', 'TVBS', '民視新聞', '三立新聞', '公視新聞', '風傳媒', '報導者', '關鍵評論網', 'Peopo 公民新聞'],
  },
  {
    group: '中央社（分類）',
    items: ['政治', '兩岸', '產經', '科技', '生活', '社會', '地方', '文化', '娛樂', '國際'],
  },
  {
    group: '自由時報（分類）',
    items: ['政治', '社會', '生活', '財經', '娛樂', '軍武', '國際'],
  },
  {
    group: 'Google News 主題（台灣）',
    items: ['政治', '外交', '國防', '選舉', '社會', '司法', '環境', '財經', '房市', '半導體', '科技', '民生', '醫療', '娛樂', '體育'],
  },
  {
    group: 'Google News 主題（國際）',
    items: ['Taiwan', '國際', '兩岸', '台海安全', '美中貿易', '俄烏', '中東', '亞太', '全球經濟', '中國'],
  },
  {
    group: '新聞 API',
    items: ['GDELT 全球媒體', 'NewsAPI.org'],
  },
]

interface HeaderProps {
  updatedAt?: string
  onRefresh?: () => void
  refreshing?: boolean
}

export default function Header({ updatedAt, onRefresh, refreshing }: HeaderProps) {
  const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || '新聞輿情風向儀'
  const [showSources, setShowSources] = useState(false)

  return (
    <header className="border-b border-[#E8E4DC] bg-[#F7F5F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#2C2C2C] tracking-wide">
            {siteTitle}
          </h1>
          <p className="text-xs text-[#888888] mt-0.5">台灣新聞輿情即時分析</p>
        </div>

        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-xs text-[#888888] hidden sm:block">
              更新：{new Date(updatedAt).toLocaleString('zh-TW')}
            </span>
          )}

          {/* Archive link */}
          <Link
            href="/archive"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#EBF0F7] text-[#5B7FA6] text-xs font-medium hover:bg-[#D6E4F0] transition-colors"
            title="24 小時以上的新聞會自動歸檔到這裡"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
            <span className="hidden sm:inline">查詢歷史新聞</span>
          </Link>

          {/* Sources info button */}
          <div className="relative">
            <button
              onClick={() => setShowSources(v => !v)}
              title="資料來源"
              className="p-1.5 rounded-lg text-[#888888] hover:text-[#5B7FA6] hover:bg-[#EBF0F7] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>

            {showSources && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSources(false)} />
                <div className="absolute right-0 top-9 z-20 w-64 bg-white border border-[#E8E4DC] rounded-xl shadow-lg p-4 space-y-3">
                  <p className="text-xs font-medium text-[#2C2C2C] mb-2">資料來源</p>
                  {SOURCES.map(group => (
                    <div key={group.group}>
                      <p className="text-[10px] font-medium text-[#5B7FA6] uppercase tracking-wider mb-1">
                        {group.group}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {group.items.map(src => (
                          <span
                            key={src}
                            className="text-[10px] px-1.5 py-0.5 bg-[#EFECE5] text-[#555555] rounded"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="重新整理（略過快取）"
              className="p-1.5 rounded-lg text-[#888888] hover:text-[#5B7FA6] hover:bg-[#EBF0F7] transition-colors disabled:opacity-40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing ? 'animate-spin' : ''}
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
