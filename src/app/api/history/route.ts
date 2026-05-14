import { NextRequest, NextResponse } from 'next/server'
import { listSnapshots, getSnapshot } from '@/lib/history'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const ts = req.nextUrl.searchParams.get('ts')

  if (ts) {
    const snap = await getSnapshot(Number(ts))
    if (!snap) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json(snap)
  }

  const list = await listSnapshots()
  return NextResponse.json({ entries: list })
}
