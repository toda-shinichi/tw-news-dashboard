import { Redis } from '@upstash/redis'
import { SummaryData } from '@/types'
import { HotList } from './ai'

export interface HistorySnapshot {
  generatedAt: string
  tab: string
  summary: SummaryData
  hotlist: { tw: HotList; intl: HotList }
}

const HISTORY_TTL = 60 * 60 * 24 * 30 // 30 days
const MAX_ENTRIES = 120                  // ~4 per day × 30 days

function getRedis(): Redis | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try { return new Redis({ url, token }) } catch { return null }
}

function snapKey(ts: number) {
  return `hist:snap:${ts}`
}

const INDEX_KEY = 'hist:index'

export async function saveSnapshot(snap: HistorySnapshot): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    const ts = Date.now()
    await redis.set(snapKey(ts), snap, { ex: HISTORY_TTL })

    // Keep a sorted index (newest first) capped at MAX_ENTRIES
    const raw = await redis.get<number[]>(INDEX_KEY)
    const index: number[] = Array.isArray(raw) ? raw : []
    index.unshift(ts)
    const trimmed = index.slice(0, MAX_ENTRIES)
    await redis.set(INDEX_KEY, trimmed, { ex: HISTORY_TTL })
  } catch {
    // history is non-critical, swallow errors
  }
}

export async function listSnapshots(): Promise<Array<{ ts: number; generatedAt: string; tab: string }>> {
  const redis = getRedis()
  if (!redis) return []

  try {
    const raw = await redis.get<number[]>(INDEX_KEY)
    if (!Array.isArray(raw) || raw.length === 0) return []

    // Fetch only the metadata we need by reading each key (up to 60 entries for the list view)
    const entries = await Promise.all(
      raw.slice(0, 60).map(async ts => {
        const snap = await redis.get<HistorySnapshot>(snapKey(ts))
        if (!snap) return null
        return { ts, generatedAt: snap.generatedAt, tab: snap.tab }
      })
    )
    return entries.filter((e): e is { ts: number; generatedAt: string; tab: string } => e !== null)
  } catch {
    return []
  }
}

export async function getSnapshot(ts: number): Promise<HistorySnapshot | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    return await redis.get<HistorySnapshot>(snapKey(ts))
  } catch {
    return null
  }
}
