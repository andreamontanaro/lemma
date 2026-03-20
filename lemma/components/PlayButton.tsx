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
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#0F2044] text-white font-mono text-sm font-medium"
        >
          🇮🇹 Italiano
        </Link>
        <Link
          href="/play/en"
          className="flex items-center gap-2 px-6 py-3 rounded-full border border-black/10 font-mono text-sm font-medium hover:bg-zinc-50 transition-colors"
        >
          🇬🇧 English
        </Link>
      </div>
    )
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="px-12 py-3 rounded-full bg-[#0F2044] text-white font-mono text-sm font-medium tracking-wide hover:bg-[#162d5e] transition-colors"
    >
      Gioca
    </button>
  )
}
