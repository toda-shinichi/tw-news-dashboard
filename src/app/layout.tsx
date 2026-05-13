import type { Metadata } from 'next'
import { Noto_Sans_TC } from 'next/font/google'
import './globals.css'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-noto',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '新聞輿情風向儀',
  description: '台灣新聞輿情即時分析儀表板 — 整合台灣媒體、Google News、GDELT 國際視角',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className={notoSansTC.variable}>
      <body>{children}</body>
    </html>
  )
}
