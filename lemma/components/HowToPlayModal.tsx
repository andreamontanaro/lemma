'use client'

import { useState, useEffect, useRef } from 'react'

export default function HowToPlayModal() {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open) {
      el.showModal()
    } else {
      el.close()
    }
  }, [open])

  // Close on backdrop click
  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect()
    if (!rect) return
    const clickedOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    if (clickedOutside) setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="font-mono text-xs text-zinc-600 dark:text-zinc-300 underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        Come giocare
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleClick}
        onCancel={() => setOpen(false)}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 w-[calc(100vw-2rem)] max-w-sm max-h-[90dvh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display dark:text-white text-xl font-bold italic">
            Come giocare
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Chiudi"
            className="flex items-center justify-center w-7 h-7 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Rules */}
        <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          Indovina la parola del giorno in <strong className="text-zinc-900 dark:text-zinc-100">6 tentativi</strong>.
          Ogni tentativo deve essere una parola valida di <strong className="text-zinc-900 dark:text-zinc-100">5 lettere</strong>.
        </p>

        <hr className="border-zinc-200 dark:border-zinc-700" />

        {/* Examples */}
        <div className="flex flex-col gap-4">
          <p className="font-mono text-xs text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">
            Esempi
          </p>

          {/* Correct */}
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1">
              {['R','A','D','I','O'].map((l, i) => (
                <Tile key={i} letter={l} state={i === 0 ? 'correct' : 'empty'} />
              ))}
            </div>
            <p className="font-mono text-xs text-zinc-600 dark:text-zinc-300">
              <strong className="text-zinc-900 dark:text-zinc-100">R</strong> è nella posizione giusta.
            </p>
          </div>

          {/* Present */}
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1">
              {['P','I','A','N','O'].map((l, i) => (
                <Tile key={i} letter={l} state={i === 1 ? 'present' : 'empty'} />
              ))}
            </div>
            <p className="font-mono text-xs text-zinc-600 dark:text-zinc-300">
              <strong className="text-zinc-900 dark:text-zinc-100">I</strong> è nella parola, ma in un'altra posizione.
            </p>
          </div>

          {/* Absent */}
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1">
              {['F','I','U','M','E'].map((l, i) => (
                <Tile key={i} letter={l} state={i === 2 ? 'absent' : 'empty'} />
              ))}
            </div>
            <p className="font-mono text-xs text-zinc-600 dark:text-zinc-300">
              <strong className="text-zinc-900 dark:text-zinc-100">U</strong> non è nella parola.
            </p>
          </div>
        </div>

        <hr className="border-zinc-200 dark:border-zinc-700" />

        <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
          Una nuova parola ogni giorno, disponibile in italiano e inglese.
        </p>
        </div>
      </dialog>
    </>
  )
}

type TileState = 'correct' | 'present' | 'absent' | 'empty'

function Tile({ letter, state }: { letter: string; state: TileState }) {
  const styles: Record<TileState, string> = {
    correct: 'bg-correct text-white border-correct',
    present: 'bg-present text-white border-present',
    absent:  'bg-absent text-zinc-600 dark:text-zinc-300 border-absent',
    empty:   'bg-tile-empty text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600',
  }

  return (
    <div className={`w-10 h-10 flex items-center justify-center border-2 rounded font-mono font-bold text-lg ${styles[state]}`}>
      {letter}
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
