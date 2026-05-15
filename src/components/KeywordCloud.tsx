interface Keyword {
  word: string
  count: number
}

interface KeywordCloudProps {
  keywords: Keyword[]
  loading?: boolean
  selectedWord?: string | null
  onSelect?: (word: string | null) => void
}

export default function KeywordCloud({ keywords, loading, selectedWord, onSelect }: KeywordCloudProps) {
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

  const maxCount = Math.max(1, ...keywords.map(k => k.count))

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map(({ word, count }) => {
        const weight = count / maxCount
        const isSelected = selectedWord === word
        return (
          <button
            key={word}
            onClick={() => onSelect?.(isSelected ? null : word)}
            className="px-3 py-1 rounded-full text-sm border transition-colors"
            style={{
              backgroundColor: isSelected
                ? 'rgba(91, 127, 166, 0.25)'
                : `rgba(91, 127, 166, ${0.06 + weight * 0.14})`,
              borderColor: isSelected ? '#5B7FA6' : '#E8E4DC',
              color: isSelected ? '#3D5A7A' : weight > 0.6 ? '#3D5A7A' : '#555555',
              fontWeight: isSelected || weight > 0.7 ? 500 : 400,
            }}
          >
            {word}
          </button>
        )
      })}
      {selectedWord && (
        <button
          onClick={() => onSelect?.(null)}
          className="px-3 py-1 rounded-full text-sm border border-dashed border-[#AAAAAA] text-[#888888] hover:border-[#888888] transition-colors"
        >
          清除篩選 ×
        </button>
      )}
    </div>
  )
}
