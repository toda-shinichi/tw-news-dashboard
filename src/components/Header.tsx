interface HeaderProps {
  updatedAt?: string
}

export default function Header({ updatedAt }: HeaderProps) {
  const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || '新聞輿情風向儀'

  return (
    <header className="border-b border-[#E8E4DC] bg-[#F7F5F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#2C2C2C] tracking-wide">
            {siteTitle}
          </h1>
          <p className="text-xs text-[#888888] mt-0.5">台灣新聞輿情即時分析</p>
        </div>
        {updatedAt && (
          <span className="text-xs text-[#888888] hidden sm:block">
            更新：{new Date(updatedAt).toLocaleString('zh-TW')}
          </span>
        )}
      </div>
    </header>
  )
}
