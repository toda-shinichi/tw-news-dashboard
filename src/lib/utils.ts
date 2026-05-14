import { TabRange, NewsCategory } from '@/types'

export function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

export function getDateRange(tab: TabRange): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date()
  switch (tab) {
    case 'today':
      from.setTime(from.getTime() - 24 * 60 * 60 * 1000) // 過去 24 小時
      break
    case '3days':
      from.setDate(from.getDate() - 3)
      break
    case 'week':
      from.setDate(from.getDate() - 7)
      break
    case 'month':
      from.setDate(from.getDate() - 30)
      break
  }
  return { from, to }
}

export function filterByDateRange<T extends { publishedAt: string }>(
  items: T[],
  tab: TabRange
): T[] {
  const { from, to } = getDateRange(tab)
  return items.filter(item => {
    const d = new Date(item.publishedAt)
    return d >= from && d <= to
  })
}

export function dedupeByTitle<T extends { title: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = item.title.slice(0, 30).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function truncate(str: string, maxLen: number): string {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

const SHARED_RULES = [
  {
    cat: 'entertainment' as NewsCategory,
    words: ['藝人', '演員', '歌手', '偶像', '電影', '音樂', '娛樂', '綜藝', '戲劇', '網紅', '明星', '演唱會', '韓劇', '劇組', '影集', 'KOL', '吃播', '直播主', '戀情', '八卦'],
  },
  {
    cat: 'tech' as NewsCategory,
    words: ['台積電', '半導體', '晶片', 'AI', '人工智慧', '科技', '鴻海', '5G', '電動車', '機器人', '新創', 'NVIDIA', '輝達', '晶圓', '封裝', '聯發科', '矽', '量子', '雲端', '數位'],
  },
  {
    cat: 'finance' as NewsCategory,
    words: ['股市', '台股', '外匯', '投資', '財報', 'GDP', '通膨', '升息', '降息', '房價', '央行', '金融', '銀行', '基金', 'ETF', '匯率', '景氣', '債券', '期貨', '關稅', '貿易', '出口', '進口', '經濟', '財政'],
  },
  {
    cat: 'life' as NewsCategory,
    words: ['物價', '民生', '食安', '消費', '購物', '旅遊', '美食', '健康', '飲食', '住宅', '租屋', '醫療', '醫院', '疫情', '疫苗', '長照', '生育', '少子'],
  },
  {
    cat: 'society' as NewsCategory,
    words: ['警察', '犯罪', '刑事', '事故', '火災', '地震', '颱風', '教育', '環保', '環境', '法院', '判決', '詐騙', '毒品', '校園', '治安', '公安', '搜救', '失蹤', '命案'],
  },
]

// Taiwan domestic political keywords — used for tw-column classification
const DOMESTIC_POLITICS = [
  '立法院', '行政院', '總統府', '選舉', '民進黨', '國民黨', '台灣民眾黨', '民眾黨',
  '縣市長', '縣長', '市長', '鄉長', '里長', '區長', '議員', '議會', '議長',
  '立委', '黨團', '院會', '地方政府', '縣政府', '市政府',
  '弊案', '貪污', '施政', '預算案', '政務官', '公務員',
  '賴清德', '朱立倫', '柯文哲', '侯友宜', '盧秀燕', '韓國瑜',
  '黨主席', '總召', '幹事長', '黨紀', '黨章', '中執會', '選區', '補選',
  '台灣政治', '政黨', '執政', '在野', '罷免', '公投',
]

// International political keywords — added on top for intl-column or uncolumned items
const INTL_POLITICS = [
  '外交', '兩岸', '國防', '軍事', '軍購', '中共', '解放軍', '美台',
  '川普', '習近平', '美中', '台海', '北京', '白宮', '五角大廈',
  '北約', 'G7', 'G20', '聯合國', '峰會', '高峰會', '川習', '拜登', '馬克宏',
  '制裁', '外交部', '國防部', '憲法', '大法官', '政策',
]

// tw column: politics only fires on domestic keywords
const CATEGORY_RULES_TW = [
  ...SHARED_RULES,
  { cat: 'politics' as NewsCategory, words: DOMESTIC_POLITICS },
]

// intl column (or fallback): politics includes both domestic + international
const CATEGORY_RULES_INTL = [
  ...SHARED_RULES,
  { cat: 'politics' as NewsCategory, words: [...DOMESTIC_POLITICS, ...INTL_POLITICS] },
]

export function classifyCategory(title: string, column?: string): NewsCategory {
  const rules = column === 'tw' ? CATEGORY_RULES_TW : CATEGORY_RULES_INTL
  let best: NewsCategory = 'society'
  let bestScore = 0
  for (const { cat, words } of rules) {
    const score = words.filter(w => title.includes(w)).length
    if (score > bestScore) {
      bestScore = score
      best = cat
    }
  }
  return best
}

const HOT_STOPWORDS = new Set([
  '台灣', '記者', '報導', '指出', '表示', '說明', '今天', '今日', '宣布',
  '發表', '公布', '提出', '日前', '相關', '部分', '進行', '已經', '目前',
  '最新', '消息', '新聞', '媒體', '分析', '顯示', '根據', '認為', '強調',
  // 媒體來源名稱碎片
  '新聞網', '電子報', '聯合', '中央', '中時', '民視', '三立', '自由',
  '風傳', '報導者', '公視', '東森', '關鍵', '評論', '時報', '日報',
])

export function computeHotKeywords(titles: string[], topN = 5): string[] {
  if (titles.length < 3) return []

  const freq = new Map<string, number>()
  for (const title of titles) {
    const seen = new Set<string>()
    for (let len = 2; len <= 5; len++) {
      for (let i = 0; i <= title.length - len; i++) {
        const w = title.slice(i, i + len)
        if (/^[一-鿿]+$/.test(w) && !HOT_STOPWORDS.has(w) && !seen.has(w)) {
          seen.add(w)
          freq.set(w, (freq.get(w) || 0) + 1)
        }
      }
    }
  }

  const minCount = Math.max(2, Math.ceil(titles.length * 0.1))

  // Sort by frequency DESC, then length DESC (prefer longer/more specific terms)
  const sorted = [...freq.entries()]
    .filter(([, c]) => c >= minCount)
    .sort(([wa, a], [wb, b]) => b - a || wb.length - wa.length)

  // Remove substrings of already-selected longer terms
  const result: string[] = []
  for (const [word] of sorted) {
    if (!result.some(r => r.includes(word) || word.includes(r))) {
      result.push(word)
    }
    if (result.length >= topN) break
  }

  return result
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分鐘前`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} 小時前`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} 天前`
  return date.toLocaleDateString('zh-TW')
}
