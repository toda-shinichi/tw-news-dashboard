import OpenAI from 'openai'
import { NewsItem, SentimentLabel, SummaryData } from '@/types'
import type { SocialSignals } from './social'

export interface NewsStats {
  topKeywords: Array<{ word: string; count: number }>
  categoryCounts: Record<string, number>
  totalCount: number
}

const MODEL_QUALITY = 'gemini-3.5-flash'
const MODEL_FAST    = 'gemini-3.5-flash'

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.CPA_API_KEY || 'no-key',
    baseURL: 'https://api.banana2556.com/v1',
  })
}

export async function analyzeSentiment(
  items: NewsItem[]
): Promise<Record<string, SentimentLabel>> {
  const fallback = Object.fromEntries(
    items.map(i => [i.id, 'neutral' as SentimentLabel])
  )
  if (!process.env.CPA_API_KEY || items.length === 0) return fallback

  const client = getClient()
  const BATCH_SIZE = 20
  const MAX_CONCURRENT = 10
  const result: Record<string, SentimentLabel> = { ...fallback }

  const batches: NewsItem[][] = []
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE))
  }

  async function analyzeBatch(batch: NewsItem[]): Promise<void> {
    const userContent = batch
      .map((item, idx) => `${idx + 1}. [${item.id}] ${item.title}`)
      .join('\n')
    try {
      const resp = await client.chat.completions.create({
        model: MODEL_FAST,
        messages: [
          {
            role: 'user',
            content:
              '分析新聞標題情緒，只輸出 JSON 陣列：\n1. [a1] 股市大漲創新高\n2. [a2] 颱風造成多人傷亡\n輸出：',
          },
          {
            role: 'assistant',
            content:
              '[{"id":"a1","sentiment":"positive"},{"id":"a2","sentiment":"negative"}]',
          },
          {
            role: 'user',
            content: `分析新聞標題情緒（positive/negative/neutral），只輸出 JSON 陣列：\n${userContent}\n輸出：`,
          },
        ],
        temperature: 0,
        max_tokens: 800,
      })
      const text = resp.choices[0]?.message?.content?.trim() || '[]'
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed: Array<{ id: string; sentiment: SentimentLabel }> = JSON.parse(jsonMatch[0])
        for (const entry of parsed) {
          if (['positive', 'negative', 'neutral'].includes(entry.sentiment)) {
            result[entry.id] = entry.sentiment
          }
        }
      }
    } catch {
      for (const item of batch) result[item.id] = 'neutral'
    }
  }

  // Process in parallel chunks (MAX_CONCURRENT at a time)
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
    await Promise.allSettled(batches.slice(i, i + MAX_CONCURRENT).map(analyzeBatch))
  }

  return result
}

const EMPTY_SUMMARY: SummaryData = {
  overview: '',
  direction: [],
  politics_issues: [],
  society_issues: [],
  intl_issues: [],
  life_issues: [],
  people: [],
  viral: [],
}

function buildSocialBlock(s: SocialSignals): string {
  const lines: string[] = []
  if (s.googleTrends.length > 0) {
    lines.push('[Google Trends 台灣熱搜（過去 24 小時）]')
    lines.push(s.googleTrends.slice(0, 15).join('、'))
  }
  return lines.join('\n')
}

function buildStatsBlock(stats: NewsStats): string {
  const catLine = Object.entries(stats.categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, n]) => {
      const label: Record<string, string> = { politics: '政治', society: '社會', life: '民生', intl: '國際' }
      return `${label[cat] ?? cat} ${n} 篇`
    })
    .join('、')
  const kwLine = stats.topKeywords
    .slice(0, 20)
    .map(({ word, count }) => `${word}(${count})`)
    .join('、')
  return [
    `【新聞數量統計】總計 ${stats.totalCount} 篇｜${catLine}`,
    `【高頻詞彙（真實計算）】${kwLine}`,
  ].join('\n')
}

function buildCategoryTitles(items: NewsItem[]): string {
  const LIFE_CATS_AI = new Set(['life', 'entertainment', 'finance', 'tech'])
  const buckets: Record<string, string[]> = {
    politics: [], society: [], intl: [], life: [],
  }
  for (const item of items) {
    if (item.column === 'intl') {
      buckets.intl.push(item.title)
    } else if (item.category === 'politics') {
      buckets.politics.push(item.title)
    } else if (item.category === 'society') {
      buckets.society.push(item.title)
    } else if (LIFE_CATS_AI.has(item.category ?? '')) {
      buckets.life.push(item.title)
    }
  }
  const lines: string[] = []
  const labels: [string, string][] = [
    ['politics', '政治'], ['society', '社會'], ['intl', '國際'], ['life', '民生'],
  ]
  for (const [key, label] of labels) {
    const titles = buckets[key].slice(0, 25)
    if (titles.length > 0) {
      lines.push(`【${label}新聞（${titles.length}則）】`)
      titles.forEach((t, i) => lines.push(`${i + 1}. ${t}`))
      lines.push('')
    }
  }
  return lines.join('\n')
}

export async function generateSummary(items: NewsItem[], social?: SocialSignals, stats?: NewsStats): Promise<SummaryData> {
  if (!process.env.CPA_API_KEY)
    return {
      ...EMPTY_SUMMARY,
      overview: '目前無法產生 AI 輿情分析，請確認 CPA_API_KEY 環境變數設定。',
    }
  if (items.length === 0)
    return { ...EMPTY_SUMMARY, overview: '此時段目前沒有足夠的新聞資料進行分析。' }

  const client = getClient()
  const categoryTitles = buildCategoryTitles(items)

  try {
    const resp = await client.chat.completions.create({
      model: MODEL_FAST,
      messages: [
        {
          role: 'user',
          content:
            '你是台灣輿情分析師。分析標題，只輸出 JSON，不要其他文字。\n' +
            '格式：{"overview":"...","direction":["..."],"politics_issues":["..."],"society_issues":["..."],"intl_issues":["..."],"life_issues":["..."],"people":["..."],"viral":["..."]}\n' +
            '【政治新聞】台積電擴廠爭議、立法院預算審查。\n【社會新聞】颱風警報發布、捷運事故。\n【國際新聞】美中貿易談判、歐盟峰會。\n【民生新聞】油價調漲、房租上漲。\n輸出：',
        },
        {
          role: 'assistant',
          content:
            '{"overview":"本期台灣輿情以科技外交與政治選舉為雙主軸。台積電擴廠爭議引發產業空洞化辯論；颱風警報帶動防災討論；美中貿易談判牽動台灣出口走向。整體情緒在審慎樂觀與不安觀望之間拉鋸。",' +
            '"direction":["台積電擴廠將持續引爆產業空洞化論戰，需追蹤政策回應動向","颱風路徑未定，若轉向本島48小時內防災討論將全面升溫","美中貿易談判演進直接影響台灣半導體出口，需長期關注","油價與房租齊漲形成民生壓力，消費信心指數值得觀察"],' +
            '"politics_issues":["台積電赴美擴廠：引發產業空洞化辯論，供應鏈去台化疑慮升溫","立法院預算審查：朝野角力預算刪減，行政院面臨壓力"],' +
            '"society_issues":["颱風警報防災應對：路徑未定，各縣市啟動防颱準備","捷運事故調查：肇因調查與行車安全檢討引發討論"],' +
            '"intl_issues":["美中貿易談判：關稅動向直接影響台灣科技出口","歐盟峰會決議：歐洲對中政策調整牽動台歐關係"],' +
            '"life_issues":["油價調漲：下週汽柴油價格調整，影響通勤成本","房租上漲：六都租金指數續創新高，租屋族壓力加劇"],' +
            '"people":["賴清德","黃仁勳","川普","習近平"],' +
            '"viral":["颱風警報網友瘋傳疏散路線與防災清單","台積電擴廠引爆產業空洞化論戰"]}',
        },
        {
          role: 'user',
          content: [
            '你是台灣輿情分析師，熟悉台灣政治、社會、經濟、外交生態，能從大量新聞中萃取關鍵趨勢。',
            '請綜合以下【數據摘要】、【各類別新聞標題】（含部分英文國際新聞，請理解後以繁體中文分析）與【社群訊號】，全程用繁體中文輸出 JSON，不要其他文字。',
            '',
            '格式（嚴格遵守，欄位名稱不得更改）：',
            '{',
            '  "overview": "整體輿情深度摘要，150至300字，涵蓋：當期主要事件脈絡、各議題關聯性、輿論情緒走向、對台灣社會潛在影響；文字通順具分析深度，不可流水帳",',
            '  "direction": ["5至8項方向預估，整合：升溫預測、可能走向、值得長期關注的議題、建議警戒或高度關注的事態；每項35字以內，格式：具體描述方向與觸發條件或風險"],',
            '  "politics_issues": ["依政治新聞數量多寡或重要性，條列5至8項當前最重要政治議題，格式：議題名稱：說明（整項40字以內）"],',
            '  "society_issues": ["依社會新聞數量多寡或重要性，條列5至8項當前最重要社會議題，格式：議題名稱：說明（整項40字以內）"],',
            '  "intl_issues": ["依國際新聞數量多寡或重要性，條列5至8項當前最重要國際議題，格式：議題名稱：說明（整項40字以內）"],',
            '  "life_issues": ["依民生新聞數量多寡或重要性，條列5至8項當前最重要民生議題，格式：議題名稱：說明（整項40字以內）"],',
            '  "people": ["依新聞標題出現頻率，列出過去24小時曝光最多的8至10位人物姓名（依頻率高低排列）"],',
            '  "viral": ["嚴格根據上方新聞標題中實際出現的事件，評估3至5個最可能在台灣社群引爆討論的話題；若有社群訊號則優先參考。絕對不得自行創造未出現的事件。格式：話題名稱：說明（35字以內）"]',
            '}',
            '',
            ...(stats ? ['【數據摘要】', buildStatsBlock(stats), ''] : []),
            '【各類別新聞標題（最新各取25則）】',
            categoryTitles,
            ...(social ? ['【社群訊號】', buildSocialBlock(social), ''] : []),
            '輸出：',
          ].join('\n'),
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    })

    const text = resp.choices[0]?.message?.content?.trim() || '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Partial<SummaryData>
      return {
        overview:         parsed.overview         || '',
        direction:        Array.isArray(parsed.direction)        ? parsed.direction.slice(0, 8)        : [],
        politics_issues:  Array.isArray(parsed.politics_issues)  ? parsed.politics_issues.slice(0, 8)  : [],
        society_issues:   Array.isArray(parsed.society_issues)   ? parsed.society_issues.slice(0, 8)   : [],
        intl_issues:      Array.isArray(parsed.intl_issues)      ? parsed.intl_issues.slice(0, 8)      : [],
        life_issues:      Array.isArray(parsed.life_issues)      ? parsed.life_issues.slice(0, 8)      : [],
        people:           Array.isArray(parsed.people)           ? parsed.people.slice(0, 10)          : [],
        viral:            Array.isArray(parsed.viral)            ? parsed.viral.slice(0, 5)            : [],
      }
    }
    return { ...EMPTY_SUMMARY, overview: '分析結果格式異常，請稍後再試。' }
  } catch (err) {
    console.error('[generateSummary] model error:', MODEL_FAST, err)
    return { ...EMPTY_SUMMARY, overview: 'AI 分析服務暫時無法使用，請稍後再試。' }
  }
}

export async function extractKeywords(
  items: NewsItem[]
): Promise<Array<{ word: string; count: number }>> {
  if (!process.env.CPA_API_KEY || items.length === 0) return []

  const client = getClient()
  const titles = items
    .slice(0, 50)
    .map(i => i.title)
    .join('。')

  try {
    const resp = await client.chat.completions.create({
      model: MODEL_FAST,
      messages: [
        // few-shot to enforce JSON array output
        {
          role: 'user',
          content:
            '從標題萃取議題焦點關鍵詞，只輸出 JSON 陣列，不要其他文字：\n標題：美日峰會、台灣安全、日本軍費、詐騙集團案、健保漲價\n輸出：',
        },
        {
          role: 'assistant',
          content:
            '[{"word":"美日峰會","count":3},{"word":"台灣安全","count":2},{"word":"日本軍費","count":2},{"word":"詐騙集團","count":1},{"word":"健保漲價","count":1}]',
        },
        {
          role: 'user',
          content: `從標題萃取 15–20 個當前最值得關注的議題焦點關鍵詞。範圍不限：人名、地名、事件、案件、政策、法案、組織機構、爭議、社會現象、經濟指標等，凡是目前討論度高或重要性高的詞彙均可。依重要性與出現頻率排序，只輸出 JSON 陣列，不要其他文字：\n標題：${titles}\n輸出：`,
        },
      ],
      temperature: 0,
      max_tokens: 800,
    })

    const text = resp.choices[0]?.message?.content?.trim() || '[]'
    const jsonMatch = text.match(/\[[\s\S]*?\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return Array.isArray(parsed) ? parsed.slice(0, 20) : []
    }
    return []
  } catch {
    return []
  }
}

export interface HotList {
  topics: string[]
  keywords: string[]
  people: string[]
}

export async function extractHotList(
  titles: string[],
  lang: 'zh' | 'en' = 'zh'
): Promise<HotList> {
  if (!process.env.CPA_API_KEY || titles.length === 0)
    return { topics: [], keywords: [], people: [] }

  const client = getClient()
  const joined = titles.slice(0, 60).join('。')
  const langNote = lang === 'en' ? '用繁體中文回答。' : ''

  try {
    const resp = await client.chat.completions.create({
      model: MODEL_FAST,
      messages: [
        {
          role: 'user',
          content:
            '從標題萃取熱門議題、關鍵字和人物，只輸出 JSON，格式：{"topics":["議題1","議題2","議題3","議題4","議題5"],"keywords":["詞1","詞2","詞3","詞4","詞5"],"people":["人名1","人名2","人名3","人名4","人名5"]}\n標題：美台軍購案通過、中美貿易談判、台積電擴廠、賴清德出訪、川普關稅。\n輸出：',
        },
        {
          role: 'assistant',
          content:
            '{"topics":["美台軍售爭議","中美貿易角力","台積電擴廠動向","賴清德外交布局","川普關稅政策"],"keywords":["軍購","中美談判","台積電","出訪","關稅"],"people":["賴清德","川普","黃仁勳","拜登","習近平"]}',
        },
        {
          role: 'user',
          content: `${langNote}從以下標題萃取五大熱門議題（5–8 字的主題名稱）、五大熱門關鍵字、五大熱門人物，只輸出 JSON，格式：{"topics":["議題1","議題2","議題3","議題4","議題5"],"keywords":["詞1","詞2","詞3","詞4","詞5"],"people":["人名1","人名2","人名3","人名4","人名5"]}\n標題：${joined}\n輸出：`,
        },
      ],
      temperature: 0,
      max_tokens: 300,
    })

    const text = resp.choices[0]?.message?.content?.trim() || '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as HotList
      return {
        topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 5) : [],
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
        people: Array.isArray(parsed.people) ? parsed.people.slice(0, 5) : [],
      }
    }
    return { topics: [], keywords: [], people: [] }
  } catch (err) {
    console.error('[extractHotList] error:', err)
    return { topics: [], keywords: [], people: [] }
  }
}

// Returns IDs of duplicate life-category articles (same event, different source) to exclude.
// Batches input ≤80 items to stay within token limits.
export async function dedupeLifeNewsAI(items: NewsItem[]): Promise<Set<string>> {
  if (!process.env.CPA_API_KEY || items.length === 0) return new Set()

  const client = getClient()
  const BATCH = 80
  const MAX_CONCURRENT = 4

  const batches: NewsItem[][] = []
  for (let i = 0; i < items.length; i += BATCH) {
    batches.push(items.slice(i, i + BATCH))
  }

  const allExcluded: string[] = []

  async function dedupeBatch(batch: NewsItem[]) {
    const numbered = batch.map((item, idx) => `${idx + 1}. [${item.id}] ${item.title}`).join('\n')
    try {
      const resp = await client.chat.completions.create({
        model: MODEL_FAST,
        messages: [
          {
            role: 'user',
            content:
              '以下是民生新聞清單（格式：序號. [id] 標題）。找出報導同一事件的重複新聞，每組只保留最重要的一則，其餘列為排除。只輸出要排除的 id JSON 陣列，不要其他文字。無重複則輸出 []。\n\n' +
              numbered + '\n\n輸出：',
          },
        ],
        temperature: 0,
        max_tokens: 500,
      })
      const text = resp.choices[0]?.message?.content?.trim() || '[]'
      const jsonMatch = text.match(/\[[\s\S]*?\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed)) {
          for (const id of parsed) {
            if (typeof id === 'string') allExcluded.push(id)
          }
        }
      }
    } catch (err) {
      console.error('[dedupeLifeNewsAI] batch error:', err)
    }
  }

  for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
    await Promise.allSettled(batches.slice(i, i + MAX_CONCURRENT).map(dedupeBatch))
  }

  return new Set(allExcluded)
}
