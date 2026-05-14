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
  // 機構
  '立法院', '行政院', '總統府', '監察院', '考試院', '司法院',
  // 選舉 / 政黨
  '選舉', '補選', '罷免', '公投', '政黨', '執政', '在野',
  '民進黨', '國民黨', '台灣民眾黨', '民眾黨', '時代力量', '台灣基進',
  // 職稱
  '縣市長', '縣長', '市長', '鄉長', '里長', '區長', '議員', '議會', '議長',
  '立委', '黨團', '院會', '地方政府', '縣政府', '市政府', '政務官', '公務員',
  '黨主席', '總召', '幹事長', '中執會', '選區',
  // 重要人物（現任 + 近期活躍）
  '賴清德', '蕭美琴',                        // 正副總統
  '朱立倫', '韓國瑜', '侯友宜',              // 國民黨
  '柯文哲', '黃國昌',                        // 民眾黨
  '盧秀燕', '張善政', '蔣萬安',              // 藍營縣市長
  '高虹安', '李四川', '謝國樑',              // 各地首長
  '鄭麗文', '黃世杰', '沈伯洋',              // 立委
  '蘇巧慧', '張雅琳', '陳品安', '童子瑋',   // 立委
  // 事件詞
  '弊案', '貪污', '施政', '預算案', '黨紀', '黨章', '台灣政治',
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

export function computeHotKeywords(
  titles: string[],
  topN = 5,
  minLen = 2,
  maxLen = 5,
): string[] {
  if (titles.length < 3) return []

  const freq = new Map<string, number>()
  for (const title of titles) {
    const seen = new Set<string>()
    for (let len = minLen; len <= maxLen; len++) {
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

// Known people for category-filtered people extraction
const KNOWN_PEOPLE = [
  // 台灣政治人物
  '賴清德', '蕭美琴', '卓榮泰', '鄭麗君',
  '朱立倫', '韓國瑜', '侯友宜', '江啟臣', '趙少康',
  '柯文哲', '黃國昌', '吳欣盈',
  '盧秀燕', '張善政', '蔣萬安', '高虹安', '李四川', '謝國樑',
  '鄭麗文', '黃世杰', '沈伯洋', '蘇巧慧', '張雅琳', '陳品安', '童子瑋',
  '林右昌', '陳建仁', '蘇貞昌', '陳其邁', '黃偉哲',
  // 台灣商界
  '黃仁勳', '張忠謀', '劉德音', '魏哲家', '郭台銘', '張汝京',
  '辜仲諒', '吳敏求', '王雪紅', '施振榮',
  // 國際政治
  '川普', '拜登', '賀錦麗', '馬斯克', '盧比歐', '裴洛西',
  '習近平', '李強', '王毅', '丁薛祥',
  '岸田文雄', '石破茂', '小泉進次郎',
  '馬克宏', '梅茲', '史塔默', '蕭茨',
  '澤倫斯基', '普丁', '金正恩',
  '麥卡錫', '拜登',
  // 台灣社會/娛樂
  '林俊傑', '周杰倫', '蔡依林', '五月天', '孫燕姿',
  '柯震東', '陳建州', '林志玲', '舒淇',
  '陳時中', '王必勝', '莊人祥',
]

export function extractPeopleFromTitles(titles: string[], topN = 5): string[] {
  if (titles.length === 0) return []
  const freq = new Map<string, number>()
  for (const title of titles) {
    for (const name of KNOWN_PEOPLE) {
      if (title.includes(name)) {
        freq.set(name, (freq.get(name) || 0) + 1)
      }
    }
  }
  return [...freq.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([name]) => name)
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
