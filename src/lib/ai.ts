import OpenAI from 'openai'
import { NewsItem, SentimentLabel, SummaryData } from '@/types'

const MODEL = 'gpt-5.4-mini-as'

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
  const result: Record<string, SentimentLabel> = {}

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const userContent = batch
      .map((item, idx) => `${idx + 1}. [${item.id}] ${item.title}`)
      .join('\n')

    try {
      const resp = await client.chat.completions.create({
        model: MODEL,
        messages: [
          // few-shot example to enforce JSON output
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
        const parsed: Array<{ id: string; sentiment: SentimentLabel }> = JSON.parse(
          jsonMatch[0]
        )
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

  for (const item of items) {
    if (!result[item.id]) result[item.id] = 'neutral'
  }
  return result
}

const EMPTY_SUMMARY: SummaryData = {
  overview: '',
  topics: [],
  brewing: [],
  upcoming: [],
  longterm: [],
  people: [],
  alerts: [],
}

export async function generateSummary(items: NewsItem[]): Promise<SummaryData> {
  if (!process.env.CPA_API_KEY)
    return {
      ...EMPTY_SUMMARY,
      overview: '目前無法產生 AI 輿情分析，請確認 CPA_API_KEY 環境變數設定。',
    }
  if (items.length === 0)
    return { ...EMPTY_SUMMARY, overview: '此時段目前沒有足夠的新聞資料進行分析。' }

  const client = getClient()
  const titles = items
    .slice(0, 40)
    .map((item, i) => `${i + 1}. ${item.title}`)
    .join('\n')

  try {
    const resp = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content:
            '你是台灣輿情分析師。分析標題，只輸出 JSON，不要其他文字。\n格式：{"overview":"...","topics":["..."],"brewing":["..."],"upcoming":["..."],"longterm":["..."],"people":["..."],"alerts":["..."]}\n標題：台積電宣布赴美擴廠、賴清德出訪歐洲、選舉民調公布、颱風警報發布、美中貿易談判。\n輸出：',
        },
        {
          role: 'assistant',
          content:
            '{"overview":"本期輿情以科技外交為主軸，整體基調偏中性偏積極，台積電擴廠帶動產業信心，但颱風警報與選戰動態引發民生與政治的雙重關注。","topics":["台積電赴美擴廠動向","賴清德歐洲外交布局","選舉民調各黨消長","颱風防災緊急應對","美中貿易談判進展"],"brewing":["台積電擴廠引發的產業空洞化辯論正在業界發酵，供應鏈去台化疑慮持續升溫","賴清德出訪後北京極可能採取外交或軍事反制動作，兩岸緊張程度值得持續追蹤","選舉民調進入關鍵期，各黨策略將隨數字變動迅速調整"],"upcoming":["颱風若轉向台灣本島，將在 48 小時內引爆大規模民生與防災報導","選舉初選提名結果公布後，藍綠攻防預計全面升溫"],"longterm":["半導體供應鏈重組對台灣在全球分工角色的長遠影響","台美關係持續深化與兩岸對峙並存的戰略平衡挑戰"],"people":["賴清德","黃仁勳","川普","習近平","柯文哲"],"alerts":["颱風路徑48小時仍不確定，若轉向台灣需立即進入防災應變","賴清德出訪期間兩岸軍事動態需高度關注，解放軍演習風險升高"]}',
        },
        {
          role: 'user',
          content: `你是台灣輿情分析師。分析以下新聞標題，用繁體中文只輸出 JSON，不要其他文字。\n格式：{"overview":"整體輿情2-3句含情緒判讀","topics":["當前五大議題（15字以內）"],"brewing":["正在醞釀的3個動向，說明往哪個方向發展（30字以內）"],"upcoming":["2-3個即將可能升溫的話題及原因（30字以內）"],"longterm":["2-3個長期需關注的重要議題（25字以內）"],"people":["當前最受關注的4-6位人物姓名"],"alerts":["今日需特別注意的2-3個警示：潛在危機、爭議升溫或緊張情勢（40字以內，含具體說明）"]}\n新聞標題：\n${titles}\n輸出：`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    })

    const text = resp.choices[0]?.message?.content?.trim() || '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as SummaryData
      return {
        overview: parsed.overview || '',
        topics:   Array.isArray(parsed.topics)   ? parsed.topics.slice(0, 5)   : [],
        brewing:  Array.isArray(parsed.brewing)  ? parsed.brewing.slice(0, 3)  : [],
        upcoming: Array.isArray(parsed.upcoming) ? parsed.upcoming.slice(0, 3) : [],
        longterm: Array.isArray(parsed.longterm) ? parsed.longterm.slice(0, 3) : [],
        people:   Array.isArray(parsed.people)   ? parsed.people.slice(0, 6)   : [],
        alerts:   Array.isArray(parsed.alerts)   ? parsed.alerts.slice(0, 3)   : [],
      }
    }
    return { ...EMPTY_SUMMARY, overview: '分析結果格式異常，請稍後再試。' }
  } catch {
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
      model: MODEL,
      messages: [
        // few-shot to enforce JSON array output
        {
          role: 'user',
          content:
            '從標題萃取關鍵詞，只輸出 JSON 陣列，不要其他文字：\n標題：美日峰會、台灣安全、日本軍費\n輸出：',
        },
        {
          role: 'assistant',
          content:
            '[{"word":"美日峰會","count":3},{"word":"台灣安全","count":2},{"word":"日本軍費","count":1}]',
        },
        {
          role: 'user',
          content: `從標題萃取 10–15 個最重要的高頻關鍵詞（人名、地名、事件），只輸出 JSON 陣列，不要其他文字：\n標題：${titles}\n輸出：`,
        },
      ],
      temperature: 0,
      max_tokens: 500,
    })

    const text = resp.choices[0]?.message?.content?.trim() || '[]'
    const jsonMatch = text.match(/\[[\s\S]*?\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return Array.isArray(parsed) ? parsed.slice(0, 15) : []
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
      model: MODEL,
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
  } catch {
    return { topics: [], keywords: [], people: [] }
  }
}
