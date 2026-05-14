import { ReactNode } from 'react'

interface SummaryBannerProps {
  text: string
  loading?: boolean
}

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: ReactNode[] = []
  let listItems: string[] = []

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key} className="list-disc list-inside space-y-1 mb-3 text-sm text-[#2C2C2C] leading-relaxed">
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  lines.forEach((line, idx) => {
    const key = `line-${idx}`

    if (line.startsWith('## ') || line.startsWith('# ')) {
      flushList(`list-before-${idx}`)
      const headingText = line.replace(/^#+\s+/, '')
      elements.push(
        <h3 key={key} className="text-sm font-semibold text-[#3D5A7A] mt-3 mb-1">
          {headingText}
        </h3>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2))
    } else if (line.trim() === '') {
      flushList(`list-empty-${idx}`)
    } else {
      flushList(`list-before-p-${idx}`)
      elements.push(
        <p key={key} className="text-sm text-[#2C2C2C] leading-relaxed mb-2">
          {renderInline(line)}
        </p>
      )
    }
  })

  flushList('list-end')
  return elements
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-[#2C2C2C]">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function SummaryBanner({ text, loading }: SummaryBannerProps) {
  return (
    <div className="bg-[#EBF0F7] border border-[#5B7FA6]/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-[#5B7FA6]" />
        <span className="text-xs font-medium text-[#5B7FA6] uppercase tracking-widest">
          AI 輿情分析
        </span>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 bg-[#5B7FA6]/10 rounded animate-pulse w-full" />
          <div className="h-4 bg-[#5B7FA6]/10 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-[#5B7FA6]/10 rounded animate-pulse w-4/6" />
          <div className="h-4 bg-[#5B7FA6]/10 rounded animate-pulse w-full mt-3" />
          <div className="h-4 bg-[#5B7FA6]/10 rounded animate-pulse w-3/4" />
        </div>
      ) : (
        <div>{renderMarkdown(text)}</div>
      )}
    </div>
  )
}
