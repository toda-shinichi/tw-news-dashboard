interface Keyword {
  word: string
  count: number
}

interface KeywordCloudProps {
  keywords: Keyword[]
  loading?: boolean
}

export default function KeywordCloud({ keywords, loading }: KeywordCloudProps) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[80, 60, 90, 70, 55, 75, 65, 85].map((w, i) => (
          <div
            key={i}
            className="h-7 bg-[#EFECE5] rounded-full animate-pulse"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
    )
  }

  if (!keywords.length) return null

  const maxCount = Math.max(...keywords.map(k => k.count))

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map(({ word, count }) => {
        const weight = count / maxCount
        return (
          <span
            key={word}
            className="px-3 py-1 rounded-full text-sm border border-[#E8E4DC] cursor-default transition-colors hover:border-[#5B7FA6]/40"
            style={{
              backgroundColor: `rgba(91, 127, 166, ${0.06 + weight * 0.14})`,
              color: weight > 0.6 ? '#3D5A7A' : '#555555',
              fontWeight: weight > 0.7 ? 500 : 400,
            }}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}
