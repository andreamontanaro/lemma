'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'auto' | 'dark'

function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('auto')

  // Read stored preference on mount
  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Theme | null) ?? 'auto'
    setTheme(stored)
  }, [])

  // Apply theme and persist; in auto mode track system changes
  useEffect(() => {
    localStorage.setItem('theme', theme)
    applyTheme(theme)
    if (theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('auto')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', label: 'Light', icon: <SunIcon /> },
    { value: 'auto',  label: 'Auto',  icon: <MonitorIcon /> },
    { value: 'dark',  label: 'Dark',  icon: <MoonIcon /> },
  ]

  return (
    <div
      role="group"
      aria-label="Tema"
      className="flex items-center gap-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5"
    >
      {options.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={label}
          aria-pressed={theme === value}
          className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
            theme === value
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MonitorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  )
}
