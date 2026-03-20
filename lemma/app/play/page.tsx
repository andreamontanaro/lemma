import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import PlayButton from '@/components/PlayButton'

interface Session {
  completed: boolean
  guesses: unknown[]
  daily_words: { date: string }[] | { date: string } | null
}

function computeStats(sessions: Session[]) {
  const played = sessions.length
  const won = sessions.filter(s => s.completed).length
  const winPct = played > 0 ? Math.round((won * 100) / played) : 0

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  for (const s of sessions) {
    if (s.completed && Array.isArray(s.guesses)) {
      const n = s.guesses.length
      if (n >= 1 && n <= 6) distribution[n]++
    }
  }

  const withDates = sessions
    .filter(s => s.daily_words)
    .map(s => {
      const dw = s.daily_words!
      const date = Array.isArray(dw) ? dw[0]?.date : dw.date
      return { completed: s.completed, date: date ?? '' }
    })
    .filter(s => s.date)
    .sort((a, b) => b.date.localeCompare(a.date))

  let streak = 0
  if (withDates.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
    const mostRecent = withDates[0].date

    if (mostRecent === today || mostRecent === yesterday) {
      let expected = mostRecent
      for (const s of withDates) {
        if (s.date !== expected || !s.completed) break
        streak++
        const d = new Date(expected + 'T12:00:00Z')
        d.setUTCDate(d.getUTCDate() - 1)
        expected = d.toISOString().split('T')[0]
      }
    }
  }

  return { played, won, winPct, streak, distribution }
}

export default async function PlayPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('completed, guesses, daily_words(date)')
    .eq('user_id', user.id)

  const stats = computeStats((sessions ?? []) as Session[])
  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? ''
  const maxDist = Math.max(...Object.values(stats.distribution), 1)

  return (
    <main className="flex flex-1 flex-col items-center px-6 pt-14 pb-12 gap-10 max-w-xs mx-auto w-full">

      <h1 className="font-display text-5xl font-bold italic">
        lemma<span className="text-[#C45C1A]">.</span>
      </h1>

      {firstName && (
        <p className="font-mono text-sm text-zinc-500 -mt-4">
          Ciao, {firstName}
        </p>
      )}

      {/* Stats */}
      <div className="w-full grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Giorni\ngiocati', value: stats.played },
          { label: 'Vittorie', value: `${stats.winPct}%` },
          { label: 'Streak\ncorrente', value: stats.streak },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1 py-4 border border-zinc-100 rounded-xl">
            <span className="font-display text-3xl font-bold leading-none">{value}</span>
            <span className="font-mono text-[10px] text-zinc-400 whitespace-pre-line leading-tight mt-1">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Win distribution */}
      <div className="w-full flex flex-col gap-2">
        <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
          Distribuzione vittorie
        </p>
        {[1, 2, 3, 4, 5, 6].map(n => {
          const count = stats.distribution[n]
          const pct = Math.max(Math.round((count / maxDist) * 100), count > 0 ? 8 : 0)
          return (
            <div key={n} className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-400 w-3 shrink-0">{n}</span>
              <div className="flex-1 h-6 bg-zinc-100 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[#0F2044] rounded-sm flex items-center justify-end pr-1.5 transition-all"
                  style={{ width: `${pct}%` }}
                >
                  {count > 0 && (
                    <span className="font-mono text-[10px] text-white leading-none">{count}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <PlayButton />
    </main>
  )
}
