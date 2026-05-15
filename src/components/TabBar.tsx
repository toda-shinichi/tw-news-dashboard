'use client'

import { TabRange } from '@/types'
import clsx from 'clsx'

interface TabBarProps {
  active: TabRange
  onChange: (tab: TabRange) => void
}

const TABS: { value: TabRange; label: string }[] = [
  { value: 'today', label: '今天' },
]

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="flex gap-1 bg-[#EFECE5] p-1 rounded-lg w-fit">
      {TABS.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={clsx(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            active === tab.value
              ? 'bg-white text-[#5B7FA6] shadow-sm'
              : 'text-[#555555] hover:text-[#2C2C2C]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
