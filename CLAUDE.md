# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `lemma/` directory:

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint (flat config v9)
```

No test runner is configured yet.

## Architecture

**lemma** is a bilingual (IT/EN) Wordle-like game — Next.js 15 monolith with App Router. Frontend, API routes, and backend logic coexist in the same `lemma/` directory and deploy together to Vercel. Database is Supabase PostgreSQL with RLS on all tables.

### Directory layout

```
lemma/
├── app/
│   ├── page.tsx                     # Home — language selection
│   ├── play/[lang]/page.tsx         # Game page (grid, keyboard, timer)
│   ├── leaderboard/page.tsx         # Daily leaderboard
│   ├── 1v1/page.tsx                 # Lobby
│   ├── 1v1/[roomId]/page.tsx        # Live 1v1 match
│   └── api/
│       ├── guess/route.ts           # Validate guess, return color feedback
│       ├── score/route.ts           # Calculate and save score
│       ├── cron/daily-word/route.ts # Nightly word draw (Vercel Cron)
│       └── 1v1/create/route.ts      # Create 1v1 room
├── lib/
│   ├── supabase.ts                  # Browser + server Supabase clients
│   ├── scoring.ts                   # Pure scoring function
│   ├── types.ts                     # Shared DB entity types
│   └── words/                       # IT/EN word dictionaries (JSON)
├── components/                      # Grid, Keyboard, Tile, Timer, ScoreCard
├── hooks/                           # use-*.ts custom hooks
└── public/fonts/                    # Self-hosted Playfair Display + DM Mono
```

### Critical security rule

**The daily word is never sent to the client.** All guess comparison logic runs server-side in `/api/guess`, using the Supabase service role key. The client only receives color feedback arrays.

### API route pattern

Every route handler follows: input validation → auth check (if required) → business logic → `NextResponse.json()` with appropriate status. Centralize error handling in `lib/api-utils.ts`. Routes touching the daily word use the service role client exclusively.

### Authentication flow

Progressive: anonymous play → optional upgrade to Google OAuth or magic link for leaderboard/1v1 access. An anonymous user can upgrade mid-session without losing their game.

### Real-time (1v1)

Supabase Realtime WebSocket subscriptions on the `matches` table. Opponents see only tile colors, never letters — this information asymmetry is the core mechanic.

### Scoring algorithm (`lib/scoring.ts`)

Exports `calculateScore({ guesses, timeSeconds, dailyWord })` → `{ total, attempts, time, quality }`.

- **Attempts (50%):** 500/450/375/275/150/50 pts for guesses 1–6
- **Time (30%):** `max(30, 300 - 50 * ln(max(1, seconds - 30)))` — first 30s free
- **Quality (20%):** `max(0, 200 - 25 * repeated_gray_letters)`
- **Final:** `clamp(sum, 1, 1000)`

### Database tables (all RLS-protected)

| Table | Purpose |
|---|---|
| `words` | Dictionary (5-char, `word+lang` unique, `used_on` tracks usage) |
| `daily_words` | Today's word per language, populated by cron |
| `game_sessions` | Per-user game state: guesses (jsonb), time, score; unique on `(user_id, daily_word_id)` |
| `matches` | 1v1 room: status `waiting→playing→finished`, `p1_guesses`/`p2_guesses` jsonb |

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL         # Public
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Public, RLS-limited
SUPABASE_SERVICE_ROLE_KEY        # Server-only
CRON_SECRET                      # Header protecting /api/cron/daily-word
```

## Design system

**Fonts:** Playfair Display (display — logo, tile letters, headings) and DM Mono (mono — labels, scores, UI text). Both self-hosted in `public/fonts/`.

**Gameplay colors** (define in `tailwind.config.ts` as semantic tokens):

```
--color-correct:  #0F2044  (navy — right letter, right position)
--color-present:  #C45C1A  (burnt orange — right letter, wrong position)
--color-absent:   #C8CDD8  (stone — letter not in word)
--color-empty:    #FFFFFF  (white — unfilled tile)
```

**Logo:** "lemma" in Playfair Display bold italic + a burnt orange (`#C45C1A`) period. The orange period is the only chromatic element and matches the "present" tile color.

## Code conventions

- **TypeScript strict** throughout. Use `interface` for DB entities, `type` for unions. Never `any` — use `unknown` + type guards.
- **Components:** PascalCase, one per file, function components with hooks. Grid/Keyboard components are controlled (state + callbacks via props, no internal fetches).
- **Files:** kebab-case except React components. Hooks in `hooks/use-*.ts`.
- **CSS:** Tailwind utility classes only. No custom CSS except documented exceptions. Dark mode via Tailwind `class` strategy.
- **Commits:** Conventional format in English — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
