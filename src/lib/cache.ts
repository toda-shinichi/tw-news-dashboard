import { Redis } from '@upstash/redis'

// In-memory fallback when Upstash env vars are not set
const memCache = new Map<string, { value: unknown; expiresAt: number }>()

function pruneMemCache(): void {
  const now = Date.now()
  for (const [key, entry] of memCache) {
    if (now > entry.expiresAt) memCache.delete(key)
  }
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.warn('[cache] Redis env vars missing, using memCache')
    return null
  }
  try {
    return new Redis({ url, token })
  } catch (err) {
    console.error('[cache] Redis init failed:', err)
    return null
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (redis) {
    try {
      const val = await redis.get<T>(key)
      return val ?? null
    } catch {
      // fall through to memory
    }
  }
  const entry = memCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key)
    return null
  }
  return entry.value as T
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 21600
): Promise<void> {
  const redis = getRedis()
  if (redis) {
    try {
      await redis.set(key, value, { ex: ttlSeconds })
      return
    } catch (err) {
      console.error(`[cache] Redis SET ${key} failed:`, err)
      // fall through to memory
    }
  }
  if (memCache.size > 200) pruneMemCache()
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}
