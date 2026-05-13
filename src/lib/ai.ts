import OpenAI from 'openai'
import { NewsItem, SentimentLabel } from '@/types'

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
    const prompt = batch
      .map((item, idx) => `${idx + 1}. [${item.id}] ${item.title}`)
      .join('\n')

    try {
      const resp = await client.chat.completions.create({
        model: 'gpt-5.4-mini',
        messages: [
          {
            role: 'system',
            content: `你是繁體中文新聞情緒分析師。分析每則新聞標題的情緒傾向。
回傳純 JSON 陣列，格式：[{"id":"xxx","sentiment":"positive"|"negative"|"neutral"}]
只回傳 JSON，不要其他文字。`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 600,
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

  // fill any missing with neutral
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
      model: 'gpt-5.4',
      messages: [
        {
          role: 'system',
          content: `你是一位台灣政治社會新聞分析師。根據提供的新聞標題，撰寫 2–3 段繁體中文輿情總結。
包含：整體情緒判讀（樂觀／悲觀／中性）、本期主要議題、值得關注的趨勢。
語氣專業、客觀、簡潔，每段 2–4 句。`,
        },
        {
          role: 'user',
          content: `以下是本期新聞標題，請撰寫輿情總結：\n\n${titles}`,
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
      model: 'gpt-5.4-mini',
      messages: [
        {
          role: 'system',
          content: `從新聞標題中萃取 10–15 個高頻關鍵詞，代表本期最重要的議題（人名、地名、事件名均可）。
回傳純 JSON 陣列：[{"word":"關鍵詞","count":頻次估計}]
按 count 降序排列。只回傳 JSON，不要其他文字。`,
        },
        { role: 'user', content: titles },
      ],
      temperature: 0,
      max_tokens: 400,
    })

    const text = resp.choices[0]?.message?.content?.trim() || '[]'
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
    return []
  } catch {
    return []
  }
}
