import OpenAI from 'openai'
import { NewsItem, SentimentLabel, SummaryData } from '@/types'
import type { SocialSignals } from './social'

const MODEL_QUALITY = 'gpt-5.4-mini-as'
const MODEL_FAST    = 'gpt-5.4-mini-as'

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
        model: MODEL_FAST,
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
  dynamics: [],
  watchlist: [],
  people: [],
  viral: [],
}

function buildSocialBlock(s: SocialSignals): string {
  const lines: string[] = []
  if (s.pttHot.length > 0) {
    lines.push('[PTT 八卦板熱門（推文數排序）]')
    s.pttHot.slice(0, 12).forEach(t => lines.push(`・${t}`))
  }
  if (s.dcardHot.length > 0) {
    lines.push('[Dcard 熱門文章]')
    s.dcardHot.slice(0, 10).forEach(t => lines.push(`・${t}`))
  }
  if (s.googleTrends.length > 0) {
    lines.push('[Google Trends 台灣熱搜（過去 24 小時）]')
    lines.push(s.googleTrends.slice(0, 15).join('、'))
  }
  return lines.join('\n')
}

export async function generateSummary(items: NewsItem[], social?: SocialSignals): Promise<SummaryData> {
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
      model: MODEL_FAST,
      messages: [
        {
          role: 'user',
          content:
            '你是台灣輿情分析師。分析標題，只輸出 JSON，不要其他文字。\n格式：{"overview":"...","topics":["..."],"dynamics":["..."],"watchlist":["..."],"people":["..."],"viral":["..."]}\n標題：台積電宣布赴美擴廠、賴清德出訪歐洲、選舉民調公布、颱風警報發布、美中貿易談判。\n輸出：',
        },
        {
          role: 'assistant',
          content:
            '{"overview":"本期台灣輿情以科技外交與政治選舉為雙主軸，整體基調偏中性偏積極。台積電宣布赴美大規模擴廠，在帶動產業信心的同時，也引發各界對台灣產業空洞化的隱憂，相關辯論預計在業界與政界持續延燒。賴清德歐洲出訪行程備受外界矚目，此次外交布局被視為強化台灣與民主陣營連結的重要一步，但北京可能的反制動作亦在可預期範圍之內，兩岸緊張程度值得密切追蹤。與此同時，選舉民調持續更新，各黨消長牽動策略布局；颱風警報發布為台灣增添民生壓力；美中貿易談判的演進亦直接影響台灣出口產業的未來走向。整體而言，政治、經濟、外交三條線同步推進，輿論情緒在審慎樂觀與不安觀望之間拉鋸。","topics":["台積電赴美擴廠：引發產業空洞化辯論，供應鏈去台化疑慮升溫","賴清德歐洲出訪：強化民主陣營外交布局，北京反制動作受關注","選舉民調各黨消長：初選提名進入關鍵期，藍綠攻防全面展開","颱風警報防災應對：若轉向本島將引爆大規模民生與防災報導","美中貿易談判進展：直接影響台灣半導體與科技出口產業走向"],"dynamics":["台積電擴廠引發的產業空洞化辯論正在業界發酵，供應鏈去台化疑慮持續升溫","賴清德出訪後北京可能採取外交或軍事反制，兩岸緊張程度值得持續追蹤","選舉民調進入關鍵期，各黨策略將隨數字變動迅速調整","颱風若轉向台灣本島，將在48小時內引爆大規模防災討論"],"watchlist":["半導體供應鏈重組對台灣全球分工角色的長遠影響","台美關係深化與兩岸對峙並存的戰略平衡挑戰","颱風路徑48小時仍不確定，若轉向需立即進入防災應變","賴清德出訪期間解放軍演習風險升高，需高度關注"],"people":["賴清德","黃仁勳","川普","習近平","柯文哲"],"viral":["颱風警報發布，各地網友瘋傳疏散路線與物資清單，防災話題熱度激增","台積電赴美擴廠消息引爆「產業空洞化」論戰，PTT科技板大量討論","選舉民調截圖熱傳，藍綠支持者論戰激烈","賴清德出訪期間的外交禮遇畫面在Threads與IG流傳","美中貿易戰對台灣薪資與就業影響的討論在Dcard升溫"]}',
        },
        {
          role: 'user',
          content: [
            '你是台灣社群輿情分析師，熟悉 PTT、Dcard、Instagram、Threads、YouTube 台灣社群的討論生態。',
            '請綜合以下【新聞標題】與【社群訊號】，用繁體中文只輸出 JSON，不要其他文字。',
            '',
            '格式：',
            '{"overview":"整體輿情深度摘要，必須150至300字，涵蓋：當期主要事件脈絡、各議題之間的關聯性、整體輿論情緒走向（樂觀/悲觀/焦慮/對立等），以及對台灣社會的潛在影響；文字通順、具分析深度，不可流水帳羅列","topics":["五大當前議題，每項格式為『議題名稱：具體說明內容』，說明部分需點出核心爭點、涉及對象或影響範圍（整項40字以內）"],"dynamics":["4至6項動向預測，整合正在醞釀中的發展與即將可能升溫的話題，說明趨勢方向與觸發條件（每項35字以內）"],"watchlist":["3至5項觀察清單，整合需長期追蹤的重要議題與今日特別警示，需具體說明風險或觀察重點（每項35字以內）"],"people":["當前最受關注的4至6位人物姓名"],"viral":["根據PTT/Dcard熱門文章與Google Trends熱搜，綜合評估5至10個最可能在台灣社群引爆討論的話題，優先納入社群訊號中已熱議者，說明討論族群與潛在爭議方向（每項35字以內）"]}',
            '',
            '【新聞標題】',
            titles,
            ...(social ? ['', '【社群訊號】', buildSocialBlock(social)] : []),
            '',
            '輸出：',
          ].join('\n'),
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const text = resp.choices[0]?.message?.content?.trim() || '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as SummaryData
      return {
        overview:  parsed.overview || '',
        topics:    Array.isArray(parsed.topics)    ? parsed.topics.slice(0, 5)    : [],
        dynamics:  Array.isArray(parsed.dynamics)  ? parsed.dynamics.slice(0, 6)  : [],
        watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist.slice(0, 5) : [],
        people:    Array.isArray(parsed.people)    ? parsed.people.slice(0, 6)    : [],
        viral:     Array.isArray(parsed.viral)     ? parsed.viral.slice(0, 10)    : [],
      }
    }
    return { ...EMPTY_SUMMARY, overview: '分析結果格式異常，請稍後再試。' }
  } catch (err) {
    console.error('[generateSummary] model error:', MODEL_QUALITY, err)
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
  } catch {
    return { topics: [], keywords: [], people: [] }
  }
}
