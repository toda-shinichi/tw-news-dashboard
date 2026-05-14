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

// 民生：整併原娛樂、財經、科技、民生四類
const LIFE_WORDS = [
  // 娛樂
  '藝人', '演員', '歌手', '偶像', '電影', '音樂', '娛樂', '綜藝', '戲劇', '網紅', '明星',
  '演唱會', '韓劇', '劇組', '影集', 'KOL', '吃播', '直播主', '戀情', '八卦',
  '電視劇', '電視節目', '首映', '票房', '金馬', '金鐘', '金曲', '頒獎',
  'Netflix', '串流', '動漫', '漫畫', '電競', '時尚', '模特',
  '新專輯', '巡迴演唱', '粉絲', '發片', '出道', '戀愛', '分手', '結婚', '離婚',
  // 科技
  '台積電', '半導體', '晶片', 'AI', '人工智慧', '科技', '鴻海', '5G', '電動車', '機器人',
  'NVIDIA', '輝達', '晶圓', '封裝', '聯發科', '量子', '雲端', '數位',
  'ChatGPT', 'OpenAI', '大模型', '機器學習', '算力', '資料中心',
  '手機', '蘋果', 'Apple', 'iPhone', 'Android', '三星', '小米', '華為',
  '資安', '駭客', '資料外洩', '個資', '數位轉型', '軟體', '硬體',
  'SpaceX', '衛星', '自動駕駛', '無人機', '充電樁', '電池',
  '網路', '寬頻', '光纖', '平台', '演算法',
  // 財經
  '股市', '台股', '外匯', '投資', '財報', 'GDP', '通膨', '升息', '降息', '房價', '央行',
  '金融', '銀行', '基金', 'ETF', '匯率', '景氣', '債券', '期貨', '關稅', '貿易', '出口',
  '進口', '經濟', '財政', '上市', '上櫃', '掛牌', '財政部', '金管會', '外資',
  '電商', '零售', '百貨', '超商', '便利商店', '連鎖',
  '薪資', '薪水', '加薪', '裁員', '失業率', '就業',
  '電費', '油價', '天然氣', '能源', 'CPI', 'PMI',
  '地產', '不動產', '都更', '購屋', '貸款', '利率', '股價',
  // 民生
  '物價', '民生', '食安', '消費', '購物', '旅遊', '美食', '健康', '飲食', '住宅', '租屋',
  '醫療', '醫院', '疫情', '疫苗', '長照', '生育', '少子',
  '交通', '捷運', '台鐵', '高鐵', '公車', '機場', '航班', '班機',
  '天氣', '氣溫', '梅雨', '寒流', '熱浪', '空汙', 'PM2.5', '空氣品質',
  '學校', '大學', '高中', '國中', '國小', '幼兒園', '招生', '入學', '學測', '升學',
  '農業', '農產', '漁業', '水果', '蔬菜', '糧食',
  '寵物', '動物', '收養',
  '文化', '歷史', '古蹟', '博物館', '藝術', '展覽', '表演', '節慶', '廟會',
  '道路', '橋梁', '停電', '停水', '施工',
  '運動', '健身', '棒球', '籃球', '足球', '羽球', '網球', '游泳',
]

const SHARED_RULES = [
  { cat: 'life' as NewsCategory, words: LIFE_WORDS },
  {
    cat: 'society' as NewsCategory,
    words: [
      '警察', '警方', '犯罪', '刑事', '事故', '火災', '地震', '颱風', '教育', '環保', '環境',
      '法院', '判決', '詐騙', '毒品', '校園', '治安', '公安', '搜救', '失蹤', '命案',
      '傷亡', '死亡', '受傷', '意外', '車禍', '墜落', '溺水', '爆炸', '漏氣',
      '性騷擾', '性侵', '家暴', '兒虐', '霸凌', '自殺',
      '環境污染', '廢水', '廢氣', '垃圾', '回收', '節能', '氣候',
      '司法', '檢察', '起訴', '逮捕', '搜索', '羈押', '假釋', '緩刑',
      '示威', '抗議', '遊行', '罷工', '陳情',
      // 刑案相關
      '嫌疑', '涉嫌', '偵查', '被告', '嫌犯', '通緝', '遇害', '受害', '暴力',
      '違法', '非法', '詐欺', '竊盜', '搶奪', '縱火', '槍擊', '傷人',
    ],
  },
]

// Taiwan domestic political keywords — used for tw-column classification
const DOMESTIC_POLITICS = [
  // 機構
  '立法院', '行政院', '總統府', '監察院', '考試院', '司法院', '國安會',
  // 選舉 / 政黨
  '選舉', '補選', '罷免', '公投', '政黨', '執政', '在野',
  '民進黨', '國民黨', '台灣民眾黨', '民眾黨', '時代力量', '台灣基進',
  // 職稱與角色
  '縣市長', '縣長', '市長', '鄉長', '里長', '區長', '議員', '議會', '議長',
  '立委', '黨團', '院會', '地方政府', '縣政府', '市政府', '政務官', '公務員',
  '黨主席', '總召', '幹事長', '中執會', '選區', '部長', '次長', '署長', '局長',
  // 常見政治動詞/名詞
  '政策', '政府', '法案', '修法', '立法', '審議', '施政', '預算案', '預算',
  '黨紀', '黨章', '弊案', '貪污', '民調', '行政命令', '質詢', '朝野',
  '執政黨', '在野黨', '台灣政治',
  // 重要人物（現任 + 近期活躍）
  '賴清德', '蕭美琴',                        // 正副總統
  '朱立倫', '韓國瑜', '侯友宜',              // 國民黨
  '柯文哲', '黃國昌',                        // 民眾黨
  '盧秀燕', '張善政', '蔣萬安',              // 藍營縣市長
  '高虹安', '李四川', '謝國樑',              // 各地首長
  '鄭麗文', '黃世杰', '沈伯洋',              // 立委
  '蘇巧慧', '張雅琳', '陳品安', '童子瑋',   // 立委
  '卓榮泰', '鄭麗君', '陳建仁',              // 行政院
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

// English keyword sets for classifying international (non-Chinese) titles
const EN_POLITICS = [
  'taiwan', 'trump', 'xi jinping', 'congress', 'senate', 'parliament', 'president',
  'diplomacy', 'diplomatic', 'military', 'sanction', 'tariff', 'trade war', 'summit',
  'beijing', 'pentagon', 'white house', 'minister', 'secretary', 'foreign',
  'nato', 'g7', 'g20', 'election', 'war', 'strait', 'defense', 'security',
  'geopolit', 'bilateral', 'alliance', 'ceasefire', 'conflict', 'invasion',
]
const EN_SOCIETY = [
  'police', 'crime', 'court', 'trial', 'verdict', 'earthquake', 'flood', 'fire',
  'protest', 'demonstration', 'strike', 'accident', 'shooting', 'killed', 'died',
  'arrested', 'charged', 'school', 'education', 'climate', 'environment',
]

function classifyEnglishTitle(title: string): NewsCategory {
  const lower = title.toLowerCase()
  const ps = EN_POLITICS.filter(w => lower.includes(w)).length
  const ss = EN_SOCIETY.filter(w => lower.includes(w)).length
  if (ps > ss) return 'politics'
  if (ss > 0) return 'society'
  return 'life'
}

export function classifyCategory(title: string, column?: string): NewsCategory {
  // If mostly English (less than 30% Chinese chars), use English classification
  const cjk = (title.match(/[一-鿿]/g) ?? []).length
  const nonSpace = title.replace(/\s/g, '').length
  if (nonSpace > 0 && cjk / nonSpace < 0.3) {
    return classifyEnglishTitle(title)
  }

  const rules = column === 'tw' ? CATEGORY_RULES_TW : CATEGORY_RULES_INTL
  let best: NewsCategory | null = null
  let bestScore = 0
  for (const { cat, words } of rules) {
    const score = words.filter(w => title.includes(w)).length
    // `>=` so later-evaluated categories (society, politics) override earlier ones (life) on ties
    // Rules order: life → society → politics, meaning politics has highest effective priority
    if (score > 0 && score >= bestScore) {
      bestScore = score
      best = cat
    }
  }
  // No keyword matched — distribute to society or life based on title length heuristic
  if (!best) {
    return title.length <= 20 ? 'society' : 'life'
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
