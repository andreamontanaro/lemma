'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function PlayButton() {
  const [open, setOpen] = useState(false)

  if (open) {
    return (
      <div className="flex gap-3">
        <Link
          href="/play/it"
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-correct text-white font-mono text-sm font-medium hover:opacity-90 transition-opacity"
        >
          🇮🇹 Italiano
        </Link>
        <Link
          href="/play/en"
          className="flex items-center gap-2 px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 font-mono text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          🇬🇧 English
        </Link>
      </div>
    )
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="px-12 py-3 rounded-full bg-correct text-white font-mono text-sm font-medium tracking-wide hover:opacity-90 transition-opacity"
    >
      Gioca
    </button>
  )
}
