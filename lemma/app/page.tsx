import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import GoogleSignInButton from '@/components/GoogleSignInButton'

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/play')

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-12 px-6">
      <div className="flex flex-col items-center gap-2">
        <h1 className="font-display text-7xl font-bold italic leading-none tracking-tight">
          lemma<span className="text-[#C45C1A] not-italic">.</span>
        </h1>
        <p className="font-mono text-sm text-zinc-500 tracking-wide">
          la parola del giorno
        </p>
      </div>

      <GoogleSignInButton />
    </main>
  )
}
