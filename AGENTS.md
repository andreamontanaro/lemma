\# AGENTS.md — lemma.



> Riferimento operativo per lo sviluppo di \*\*lemma\*\*, un gioco di parole web-based con leaderboard giornaliera e modalità 1v1 in tempo reale.

> Questo file è la single source of truth per architettura, convenzioni di codice, sistema visivo e logica applicativa.



\---



\## Panoramica del progetto



lemma è un Wordle-like bilingue (italiano/inglese) con una forte dimensione social. L'utente gioca due partite al giorno (una per lingua), compete in una leaderboard pubblica con punteggio algoritmico da 1 a 1000, e può sfidare un amico in modalità 1v1 sincrona.



Il nome "lemma" — unità minima di significato lessicale — radica il brand nel territorio della lingua. Il tono è editoriale, sobrio, mai accademico.



\*\*Tagline di riferimento:\*\* "Ogni parola ha un peso." (editoriale/stampa) · "Sfida la lingua. Sfida un amico." (social/acquisizione)



\---



\## Stack tecnologico



Il progetto è un monolite Next.js 15 con App Router. Frontend e API convivono nello stesso repository, si deployano insieme e condividono tipi TypeScript. La scelta è guidata da semplicità, costo zero iniziale e scalabilità futura.



\*\*Frontend:\*\* Next.js 15 (App Router) — React con SSR/SSG, layout annidati e loading states nativi.

\*\*Backend/API:\*\* Next.js Route Handlers — le API route vivono nel progetto, zero CORS, deploy unico.

\*\*Database:\*\* Supabase (PostgreSQL) — relazionale gestito, Row Level Security abilitata su tutte le tabelle, tier gratuito.

\*\*Auth:\*\* Supabase Auth — Google OAuth, magic link email, login anonimo con upgrade progressivo.

\*\*Realtime:\*\* Supabase Realtime — WebSocket per il 1v1, sottoscrizioni ai cambiamenti di riga/tabella.

\*\*Scheduling:\*\* Vercel Cron / pg\_cron — sorteggio notturno delle parole a mezzanotte CET.

\*\*Deploy:\*\* Vercel — CDN globale, serverless functions, cron jobs, preview deploy da GitHub.

\*\*Styling:\*\* Tailwind CSS 4 — utility-first, tema chiaro/scuro, responsive.



\---



\## Struttura del progetto



```

lemma/

├── app/

│   ├── page.tsx                        # Home — selezione lingua, accesso al gioco del giorno

│   ├── play/

│   │   └── \[lang]/page.tsx             # Pagina di gioco (griglia, tastiera, timer)

│   ├── leaderboard/page.tsx            # Leaderboard giornaliera con filtri per lingua

│   ├── 1v1/

│   │   ├── page.tsx                    # Lobby — crea o entra in una stanza

│   │   └── \[roomId]/page.tsx           # Partita 1v1 in tempo reale

│   └── api/

│       ├── guess/route.ts              # Validazione tentativo + feedback colori

│       ├── score/route.ts              # Calcolo e salvataggio punteggio finale

│       ├── cron/daily-word/route.ts    # Sorteggio parole (chiamato dal cron)

│       └── 1v1/create/route.ts         # Creazione stanza 1v1

├── lib/

│   ├── supabase.ts                     # Client Supabase (browser + server)

│   ├── scoring.ts                      # Algoritmo di punteggio

│   └── words/                          # Dizionari IT/EN come file JSON

├── components/                         # Grid, Keyboard, Tile, Timer, ScoreCard, etc.

├── public/

│   └── fonts/                          # Playfair Display + DM Mono (self-hosted)

├── vercel.json                         # Config cron job

├── tailwind.config.ts                  # Design tokens lemma

└── .env.local                          # Variabili d'ambiente (mai committate)

```



\---



\## Schema database



Il database PostgreSQL su Supabase ha cinque tabelle principali. RLS è abilitata ovunque.



\### words

Dizionario completo delle parole giocabili, divise per lingua.



| Colonna    | Tipo        | Note                                                        |

|------------|-------------|-------------------------------------------------------------|

| id         | uuid PK     | Generato automaticamente                                    |

| word       | varchar(5)  | Sempre lowercase. Unique constraint su (word, lang)         |

| lang       | varchar(2)  | "it" o "en"                                                 |

| difficulty | smallint    | Opzionale, 1–5 per curating futuro                          |

| used\_on    | date        | Data in cui è stata parola del giorno (NULL = mai usata)    |



\### daily\_words

Source of truth per la parola del giorno. Popolata dal cron a mezzanotte.



| Colonna | Tipo       | Note                                        |

|---------|------------|---------------------------------------------|

| id      | uuid PK    | Generato automaticamente                    |

| date    | date       | Unique constraint su (date, lang)           |

| lang    | varchar(2) | "it" o "en"                                 |

| word\_id | uuid FK    | Riferimento a words.id                      |



\### game\_sessions

Ogni partita giocata da un utente, con tentativi, tempo e punteggio.



| Colonna       | Tipo         | Note                                                        |

|---------------|--------------|-------------------------------------------------------------|

| id            | uuid PK      | Generato automaticamente                                    |

| user\_id       | uuid FK      | → auth.users.id. Unique su (user\_id, daily\_word\_id)        |

| daily\_word\_id | uuid FK      | → daily\_words.id                                            |

| guesses       | jsonb        | Array: \[{"word": "canto", "result": \["green","gray",...]}]  |

| solved        | boolean      | Se l'utente ha indovinato                                   |

| time\_seconds  | integer      | Dal primo input all'ultimo tentativo                        |

| score         | integer      | 1–1000, NULL se non risolto                                 |

| created\_at    | timestamptz  | Timestamp inizio partita                                    |



\### matches (1v1)

Stanze di gioco per la modalità 1v1.



| Colonna     | Tipo         | Note                                                   |

|-------------|--------------|--------------------------------------------------------|

| id          | uuid PK      | Anche room ID per il link di invito                    |

| player1\_id  | uuid FK      | Chi ha creato la stanza                                |

| player2\_id  | uuid FK      | NULL finché il secondo giocatore non entra             |

| word        | varchar(5)   | Parola random scelta alla creazione                    |

| lang        | varchar(2)   | Lingua scelta dal creatore                             |

| status      | varchar(20)  | "waiting" → "playing" → "finished"                     |

| p1\_guesses  | jsonb        | Tentativi player 1                                     |

| p2\_guesses  | jsonb        | Tentativi player 2                                     |

| winner\_id   | uuid FK      | NULL se pareggio o in corso                            |

| created\_at  | timestamptz  | Timestamp creazione                                    |



\### Policy RLS da rispettare



Ogni utente legge solo le proprie `game\_sessions`. La leaderboard (vista aggregata) è pubblica in lettura. Le `matches` sono leggibili solo dai due partecipanti. `words` e `daily\_words` sono leggibili da tutti ma scrivibili solo dal service role (cron job e API server-side).



\---



\## Flussi applicativi



\### Gioco giornaliero



L'utente seleziona la lingua → il client verifica se ha già giocato oggi (query su `game\_sessions`) → se non ha giocato, si carica la griglia e il timer parte al primo input → ad ogni tentativo il client invia la parola a `POST /api/guess`, il server la valida contro il dizionario, la confronta con la parola del giorno e restituisce il feedback colorato → il client aggiorna griglia e tastiera → a partita conclusa il client chiama `POST /api/score` per calcolare e salvare il punteggio → viene mostrato il recap.



\*\*Regola critica:\*\* la parola del giorno non viene MAI inviata al client. Tutta la logica di confronto avviene server-side nelle API route, che accedono a Supabase tramite il service role key. Il client non conosce la soluzione fino a fine partita.



\### Sorteggio parole (cron, 00:00 CET)



L'endpoint `GET /api/cron/daily-word` viene invocato dal cron di Vercel. Per ciascuna lingua seleziona una parola random da `words` dove `used\_on IS NULL`, inserisce una riga in `daily\_words`, aggiorna `used\_on` nella parola scelta. L'endpoint è protetto dall'header `CRON\_SECRET`. Nel `vercel.json` l'orario è 23:00 UTC (mezzanotte CET in inverno; accettare lo shift di un'ora in estate oppure gestire il cambio DST).



\### Modalità 1v1



Player 1 chiama `POST /api/1v1/create` → il server genera un UUID, sceglie una parola random, crea la riga in `matches` con status "waiting" → Player 1 riceve un link (es. `lemma.app/1v1/abc-123`) da condividere → Player 2 apre il link, si autentica, il sistema aggiorna `player2\_id` e status a "playing" → entrambi i client si sottoscrivono via Supabase Realtime alla riga match → ad ogni tentativo il server aggiorna `p1\_guesses` o `p2\_guesses`, l'avversario vede apparire i colori in tempo reale (solo i colori, mai le lettere) → quando uno indovina o entrambi esauriscono i tentativi, status diventa "finished" e viene determinato il vincitore.



\---



\## Algoritmo di punteggio



Il punteggio va da 1 a 1000 ed è la somma di tre componenti.



\### Componente tentativi (50% — max 500 punti)



| Tentativi | Punti |

|-----------|-------|

| 1         | 500   |

| 2         | 450   |

| 3         | 375   |

| 4         | 275   |

| 5         | 150   |

| 6         | 50    |



\### Componente tempo (30% — max 300 punti)



I primi 30 secondi non penalizzano. Poi la penalizzazione cresce logaritmicamente fino a un floor di 30 punti a \~5 minuti.



```

tempo\_score = max(30, 300 - 50 \* ln(max(1, secondi - 30)))

```



\### Componente qualità (20% — max 200 punti)



Premia chi evita di ripetere lettere già grigie. Ogni lettera ripetuta inutilmente sottrae 25 punti.



```

qualita\_score = max(0, 200 - 25 \* lettere\_ripetute\_grigie)

```



\### Punteggio finale



```

score = clamp(tentativi\_score + tempo\_score + qualita\_score, 1, 1000)

```



Il 1000 perfetto è raggiungibile solo indovinando al primo tentativo in meno di 30 secondi senza ripetizioni — praticamente irraggiungibile, di design.



Il file `lib/scoring.ts` esporta una funzione pura `calculateScore({ guesses, timeSeconds, dailyWord })` che restituisce `{ total, attempts, time, quality }`.



\---



\## Autenticazione



L'approccio è progressivo: gioco anonimo per tutti, autenticazione richiesta solo per leaderboard e 1v1.



\*\*Gioco anonimo:\*\* l'utente gioca senza registrarsi. I dati si salvano in localStorage e opzionalmente come utente anonimo Supabase.

\*\*Leaderboard e 1v1:\*\* richiedono login con Google OAuth o magic link email. Un utente anonimo può fare upgrade senza perdere la partita in corso.



Le API route che modificano dati (guess, score, cron) validano il JWT tramite Supabase Auth middleware. Rate limiting via middleware Vercel per prevenire brute-force su `/api/guess` (max 6 tentativi per partita, ma serve anche protezione a livello di rete per IP).



\---



\## Variabili d'ambiente



```env

NEXT\_PUBLIC\_SUPABASE\_URL=         # URL progetto Supabase (pubblica)

NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY=    # Anon key Supabase (pubblica, limitata da RLS)

SUPABASE\_SERVICE\_ROLE\_KEY=        # Service role key (segreta, solo server-side)

CRON\_SECRET=                      # Header segreto per endpoint cron

```



Non committare mai `.env.local`. Usare le environment variables di Vercel per il deploy.



\---



\## Identità visiva e design system



\### Posizionamento



Editoriale, sobrio, distintivo, accessibile. La lingua ha peso e l'estetica lo riflette senza diventare fredda. Ogni scelta visiva è intenzionale: il silenzio visivo è deliberato quanto la presenza del colore.



\### Logo



Il logotipo è "lemma" in Playfair Display bold italic seguito da un punto in burnt orange (#C45C1A). Il corsivo bold crea tensione visiva; il punto arancio è l'unico elemento cromatico e richiama il colore delle tile "presente" nella griglia, legando identità e gameplay. Tre varianti: su bianco, su navy, su pale blue. Il punto arancio resta invariato in tutte.



\### Palette cromatica



Il sistema cromatico usa la famiglia del blu notte con un solo colore caldo (burnt orange) come accento. Non servono verde e giallo convenzionali: la distinzione tra stati avviene per temperatura e luminosità.



\*\*Colori di gameplay (da usare nei componenti Tile e Keyboard):\*\*



```

\--color-correct:    #0F2044   /\* Navy — lettera corretta nella posizione giusta \*/

\--color-present:    #C45C1A   /\* Burnt orange — lettera presente, posizione errata \*/

\--color-absent:     #C8CDD8   /\* Stone — lettera assente \*/

\--color-empty:      #FFFFFF   /\* White — tile vuota / in fase di digitazione \*/

```



\*\*Colori di interfaccia:\*\*



```

\--color-surface:          #F8F9FC   /\* Sfondo pagina \*/

\--color-surface-alt:      #EDF2FA   /\* Pale blue — superficie secondaria \*/

\--color-accent:           #2D5BE3   /\* Accent blue — link, CTA \*/

\--color-border:           #E2E6EF   /\* Bordi e divisori \*/

\--color-muted:            #6B7280   /\* Testo secondario \*/

\--color-correct-text:     #FFFFFF   /\* Testo su tile navy \*/

\--color-present-text:     #FFFFFF   /\* Testo su tile burnt orange \*/

\--color-absent-text:      #3B3F47   /\* Testo su tile stone \*/

```



\*\*Nota accessibilità:\*\* navy/burnt orange sono distinguibili anche in caso di deuteranopia (daltonismo rosso-verde più diffuso). I colori si differenziano per luminosità e temperatura, non solo per tinta.



\### Tipografia



Due famiglie con ruoli distinti. Self-hostare entrambe in `/public/fonts/` per performance.



\*\*Playfair Display\*\* — il carattere editoriale.

Usare per: logo/wordmark, titoli di sezione e pagina, lettere nelle tile di gioco (bold italic), testi editoriali e commenti (italic).



\*\*DM Mono\*\* — il carattere funzionale.

Usare per: label UI (tentativi, timer, punteggio), body text e messaggi di sistema, navigazione e microcopy, valori numerici e statistiche.



```css

/\* Configurazione Tailwind \*/

fontFamily: {

&#x20; display: \['"Playfair Display"', 'Georgia', 'serif'],

&#x20; mono: \['"DM Mono"', 'ui-monospace', 'monospace'],

}

```



\### Tile di gioco



Le tile sono il cuore visivo. La lettera è in Playfair Display bold italic — questo conferisce una presenza tipografica forte, distante dal look piatto dei concorrenti. I tre colori di stato (navy, burnt orange, stone) più il bianco per lo stato vuoto eliminano qualsiasi ambiguità percettiva.



Nella modalità 1v1 la griglia avversario mostra solo i colori, mai le lettere. L'utente percepisce il progresso dell'avversario (quante tile navy, quante burnt, quante stone) senza ricevere indizi sulla parola. Questa asimmetria informativa è il motore della tensione.



\---



\## Convenzioni di codice



\### TypeScript



Tutto il progetto è in TypeScript strict. Definire i tipi per ogni entità del database in un file `lib/types.ts` condiviso tra client e server. Preferire `interface` per le entità e `type` per le union e utility types. Non usare `any`: se il tipo non è noto, usare `unknown` e restringere con type guard.



\### Componenti React



Usare function components con hooks. Nomi in PascalCase, un componente per file. Separare la logica di stato dalla presentazione dove possibile (custom hooks in `hooks/`). I componenti della griglia e della tastiera devono essere controllati: ricevono stato e callback via props, non gestiscono fetch interni.



\### API route



Ogni route handler in `app/api/` segue questo pattern: validazione input → autenticazione (se richiesta) → logica business → risposta JSON. Restituire sempre `NextResponse.json()` con status code appropriati. Centralizzare la gestione errori in un helper `lib/api-utils.ts`. Le route che accedono alla parola del giorno usano esclusivamente il Supabase client con service role.



\### Stile e CSS



Usare esclusivamente Tailwind CSS utility classes. I design token (colori, font) vanno definiti in `tailwind.config.ts` come estensioni del tema, usando i nomi semantici della palette lemma (correct, present, absent, surface, accent, etc.). Non scrivere CSS custom salvo casi eccezionali documentati. Supportare dark mode con la strategia `class` di Tailwind.



\### File e naming



Nomi file in kebab-case per tutto tranne i componenti React (PascalCase). Le API route seguono la convenzione Next.js (`route.ts`). I tipi condivisi vivono in `lib/types.ts`. Gli hook custom in `hooks/use-\*.ts`.



\### Commit



Commit message in inglese, formato convenzionale: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`. Un commit per unità logica di lavoro.



\---



\## Roadmap



\*\*Fase 1 — Setup e fondamenta:\*\* init Next.js + TypeScript + Tailwind, setup Supabase (schema, RLS), auth (Google OAuth + anonimo), import dizionari IT/EN.



\*\*Fase 2 — Gameplay core (MVP):\*\* griglia 5×6, tastiera virtuale, animazioni tile, API guess + score, cron sorteggio giornaliero, pagina risultato con punteggio e condivisione.



\*\*Fase 3 — Leaderboard e social:\*\* leaderboard giornaliera pubblica, profilo utente con storico e stats, condivisione risultati (pattern emoji), PWA (manifest, service worker).



\*\*Fase 4 — Modalità 1v1:\*\* Supabase Realtime, lobby creazione stanza, invito via link, UI split-screen (griglia propria + griglia avversario solo colori), gestione timeout e disconnessione.

