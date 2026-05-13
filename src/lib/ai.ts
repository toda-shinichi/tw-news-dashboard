import OpenAI from 'openai'
import { NewsItem, SentimentLabel } from '@/types'

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

export async function generateSummary(items: NewsItem[]): Promise<string> {
  if (!process.env.CPA_API_KEY)
    return '目前無法產生 AI 輿情分析，請確認 CPA_API_KEY 環境變數設定。'
  if (items.length === 0) return '此時段目前沒有足夠的新聞資料進行分析。'

  const client = getClient()
  const titles = items
    .slice(0, 30)
    .map((item, i) => `${i + 1}. ${item.title}`)
    .join('\n')

  try {
    const resp = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: `你是台灣新聞輿情分析師。根據以下新聞標題，撰寫 2–3 段繁體中文輿情總結（每段 2–4 句）。
包含：整體情緒判讀（樂觀／悲觀／中性）、本期主要議題、值得關注的趨勢。語氣專業客觀。

新聞標題：
${titles}

輿情總結：`,
        },
      ],
      temperature: 0.3,
      max_tokens: 600,
    })
    return resp.choices[0]?.message?.content || '無法取得分析結果。'
  } catch {
    return 'AI 分析服務暫時無法使用，請稍後再試。'
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
}

export async function extractHotList(
  titles: string[],
  lang: 'zh' | 'en' = 'zh'
): Promise<HotList> {
  if (!process.env.CPA_API_KEY || titles.length === 0)
    return { topics: [], keywords: [] }

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
            '從標題萃取熱門議題和關鍵字，只輸出 JSON，格式：{"topics":["議題1","議題2","議題3","議題4","議題5"],"keywords":["詞1","詞2","詞3","詞4","詞5"]}\n標題：美台軍購案通過、中美貿易談判、台積電擴廠、颱風警報、選舉民調。\n輸出：',
        },
        {
          role: 'assistant',
          content:
            '{"topics":["美台軍售爭議","中美貿易角力","台積電擴廠動向","颱風防災應對","選舉政治博弈"],"keywords":["軍購","中美談判","台積電","颱風","民調"]}',
        },
        {
          role: 'user',
          content: `${langNote}從以下標題萃取五大熱門議題（5–8 字的主題名稱）與五大熱門關鍵字，只輸出 JSON，格式：{"topics":["議題1","議題2","議題3","議題4","議題5"],"keywords":["詞1","詞2","詞3","詞4","詞5"]}\n標題：${joined}\n輸出：`,
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
      }
    }
    return { topics: [], keywords: [] }
  } catch {
    return { topics: [], keywords: [] }
  }
}
