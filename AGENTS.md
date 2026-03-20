# AGENTS.md — lemma · Frontend (Next.js)

> Riferimento operativo per lo sviluppo del modulo frontend di **lemma**.
> Questo file copre esclusivamente il workspace `lemma-web/` (Next.js 15). Per la logica applicativa, il database e il realtime, fare riferimento all'AGENTS.md del backend .NET.

---

## Responsabilità di questo layer

Il frontend è uno strato di presentazione puro. Non contiene logica di business, non accede direttamente al database, non conosce la parola del giorno. Ogni operazione significativa — validazione tentativi, calcolo punteggio, gestione stanze 1v1 — è delegata all'API .NET tramite fetch o tramite la connessione SignalR.

Questo non è un vincolo architetturale arbitrario: è la garanzia che la parola del giorno non possa mai essere estratta ispezionando il codice client o le richieste di rete.

---

## Stack

**Next.js 15** con App Router — React con SSR/SSG, layout annidati, loading states nativi. L'App Router gestisce il routing file-based; i Server Components sono usati dove possibile per ridurre il bundle client.

**Supabase Auth (client-side)** — il frontend usa Supabase Auth esclusivamente per la gestione dell'autenticazione utente (Google OAuth, magic link, anonimo). Non usa Supabase per query dati: quello è compito del backend .NET.

**SignalR** — per la modalità 1v1, il client apre una connessione WebSocket verso l'hub `.NET` usando `@microsoft/signalr`. Non usa Supabase Realtime.

**Tailwind CSS 4** — utility-first, tema chiaro/scuro con strategia `class`, design token lemma configurati in `tailwind.config.ts`.

---

## Struttura del progetto

```
lemma-web/
├── app/
│   ├── page.tsx                        # Home — selezione lingua, accesso al gioco del giorno
│   ├── play/
│   │   └── [lang]/page.tsx             # Pagina di gioco (griglia, tastiera, timer)
│   ├── leaderboard/page.tsx            # Leaderboard giornaliera con filtri per lingua
│   ├── 1v1/
│   │   ├── page.tsx                    # Lobby — crea o entra in una stanza
│   │   └── [roomId]/page.tsx           # Partita 1v1 in tempo reale
├── lib/
│   ├── api-client.ts                   # Wrapper fetch verso l'API .NET
│   └── signalr-client.ts              # Client SignalR per il 1v1
├── hooks/
│   ├── use-game.ts                     # Stato e logica della partita giornaliera
│   ├── use-match.ts                    # Stato e logica della partita 1v1
│   └── use-auth.ts                     # Wrapper Supabase Auth
├── components/
│   ├── Grid.tsx                        # Griglia 5×6
│   ├── Tile.tsx                        # Singola cella con stato (correct/present/absent/empty)
│   ├── Keyboard.tsx                    # Tastiera virtuale on-screen
│   ├── Timer.tsx                       # Countdown/cronometro
│   ├── ScoreCard.tsx                   # Recap a fine partita (punteggio, breakdown, condivisione)
│   ├── Leaderboard.tsx                 # Tabella classifica
│   ├── MatchGrid.tsx                   # Griglia avversario (solo colori, niente lettere)
│   └── OpponentProgress.tsx            # Indicatore progresso avversario in 1v1
├── public/
│   └── fonts/                          # Playfair Display + DM Mono (self-hosted)
├── tailwind.config.ts                  # Design token lemma
└── .env.local                          # Variabili d'ambiente (mai committate)
```

---

## Variabili d'ambiente

```env
NEXT_PUBLIC_API_URL=              # URL base dell'API .NET (es. https://api.lemma.app)
NEXT_PUBLIC_SUPABASE_URL=         # URL progetto Supabase (per Auth client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Anon key Supabase (limitata da RLS, solo per Auth)
```

Il frontend non usa `SUPABASE_SERVICE_ROLE_KEY` né `CRON_SECRET`. Quelle variabili esistono solo nel backend .NET.

---

## Comunicazione con il backend

Tutte le chiamate all'API .NET passano per `lib/api-client.ts`, che si occupa di allegare automaticamente il JWT di Supabase Auth nell'header `Authorization: Bearer {token}`. Non fare fetch diretti ai endpoint .NET dall'interno dei componenti.

```typescript
// lib/api-client.ts — pattern atteso
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
```

### Endpoint utilizzati dal frontend

| Endpoint                          | Metodo | Quando                                              |
|-----------------------------------|--------|-----------------------------------------------------|
| `/api/guess`                      | POST   | Ad ogni tentativo nella partita giornaliera         |
| `/api/score`                      | POST   | A fine partita (vittoria o 6 tentativi esauriti)    |
| `/api/leaderboard`                | GET    | Caricamento della pagina leaderboard                |
| `/api/matches`                    | POST   | Player 1 crea una stanza 1v1                        |
| `/api/matches/{roomId}/join`      | POST   | Player 2 entra nella stanza                         |

Il frontend non chiama mai endpoint relativi al cron o al sorteggio parole — quelli sono interni al backend.

---

## Modalità 1v1 — SignalR

La connessione SignalR è gestita in `lib/signalr-client.ts` e consumata tramite `hooks/use-match.ts`. Il client si connette all'hub `/hubs/match` sul backend .NET.

```typescript
// lib/signalr-client.ts — pattern atteso
import * as signalR from '@microsoft/signalr';

export function createMatchConnection(apiUrl: string, token: string) {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${apiUrl}/hubs/match`, {
      accessTokenFactory: () => token,
    })
    .withAutomaticReconnect()
    .build();
}
```

### Eventi SignalR gestiti dal frontend

| Evento ricevuto          | Cosa fa il frontend                                                 |
|--------------------------|---------------------------------------------------------------------|
| `OpponentGuessUpdate`    | Aggiorna la griglia avversario con i nuovi colori (niente lettere)  |
| `MatchFinished`          | Mostra il recap di fine partita con vincitore e statistiche         |

| Evento inviato           | Quando                                                              |
|--------------------------|---------------------------------------------------------------------|
| `JoinMatch`              | Subito dopo aver aperto la pagina `/1v1/[roomId]`                   |
| `SubmitGuess`            | Dopo ogni tentativo validato dal backend via REST                   |

**Regola critica:** il frontend invia `SubmitGuess` via SignalR solo *dopo* aver ricevuto risposta dall'endpoint REST `/api/guess`. La validazione resta sempre server-side; SignalR serve solo per la propagazione real-time del risultato all'avversario.

---

## Autenticazione

L'autenticazione è progressiva: si può giocare la partita giornaliera senza account. Leaderboard e 1v1 richiedono login.

`hooks/use-auth.ts` wrappa `supabase.auth` ed espone `{ user, session, signIn, signOut, upgradeAnonymous }`. I componenti non importano Supabase direttamente — usano questo hook.

**Gioco anonimo:** i tentativi della partita giornaliera vengono salvati in `localStorage` finché l'utente non effettua il login. All'upgrade, la partita in corso non va persa.

**Flusso JWT:** quando l'utente si autentica, `api-client.ts` legge il JWT dalla sessione Supabase e lo allega ad ogni richiesta verso il backend .NET. Il backend valida il token indipendentemente — il frontend non gestisce nulla di questa validazione.

---

## Design system

### Palette (token Tailwind)

```typescript
// tailwind.config.ts — estensione tema
colors: {
  correct:   '#0F2044',   // Navy — lettera corretta nella posizione giusta
  present:   '#C45C1A',   // Burnt orange — lettera presente, posizione errata
  absent:    '#C8CDD8',   // Stone — lettera assente
  empty:     '#FFFFFF',   // Tile vuota / in digitazione
  surface:   '#F8F9FC',   // Sfondo pagina
  'surface-alt': '#EDF2FA', // Pale blue — superficie secondaria
  accent:    '#2D5BE3',   // Link, CTA
  border:    '#E2E6EF',
  muted:     '#6B7280',
}
```

Usare sempre i nomi semantici (`bg-correct`, `bg-present`, `bg-absent`) — mai gli hex direttamente nel JSX.

### Tipografia

```typescript
// tailwind.config.ts
fontFamily: {
  display: ['"Playfair Display"', 'Georgia', 'serif'],
  mono:    ['"DM Mono"', 'ui-monospace', 'monospace'],
}
```

**Playfair Display** — logo, titoli di sezione, lettere nelle tile (bold italic), testi editoriali.
**DM Mono** — label UI (tentativi, timer, punteggio), body text, navigazione, valori numerici.

I font sono self-hostati in `/public/fonts/`. Non usare Google Fonts CDN in produzione.

### Tile di gioco

La lettera nella tile è in Playfair Display bold italic. I quattro stati corrispondono ai quattro colori semantici: `correct`, `present`, `absent`, `empty`. Le transizioni di colore avvengono con una flip animation al momento della rivelazione (una tile alla volta, sinistra→destra).

Nella griglia avversario (`MatchGrid.tsx`) le tile mostrano solo il colore di sfondo, senza lettera. L'utente vede quante tile navy, quante burnt, quante stone — ma non ha indizi sulla parola.

---

## Convenzioni di codice

**TypeScript strict** ovunque. I tipi delle risposte API sono definiti in `lib/types.ts` e devono rispecchiare i DTO del backend .NET. Non usare `any`: se il tipo non è noto, usare `unknown` con type guard.

**Componenti React** come function components con hooks. Nomi in PascalCase, un componente per file. I componenti `Grid`, `Keyboard`, `Tile` sono controllati — ricevono stato e callback via props, non gestiscono fetch interni. La logica di stato vive negli hook custom in `hooks/`.

**API calls** sempre attraverso `lib/api-client.ts`. Mai `fetch` diretto nei componenti o nelle pagine.

**SignalR** sempre attraverso `lib/signalr-client.ts` e `hooks/use-match.ts`. Mai istanziare `HubConnectionBuilder` nei componenti.

**Stile** esclusivamente Tailwind utility classes. CSS custom solo in casi eccezionali, documentati inline. Dark mode con strategia `class`.

**Naming:** file in kebab-case tranne i componenti React (PascalCase). Hook custom in `hooks/use-*.ts`.

**Commit** in inglese, formato convenzionale: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.

---

## Flussi UI

### Partita giornaliera

Home → selezione lingua → `hooks/use-game.ts` verifica se l'utente ha già giocato oggi (controlla `localStorage` per anonimi, chiama `/api/leaderboard` o deduce dallo stato sessione per utenti autenticati) → se già giocato, mostra il recap → altrimenti carica la griglia.

Il timer parte al primo input sulla tastiera. Ad ogni invio, il hook chiama `apiPost('/api/guess', { word, lang, date })` e aggiorna lo stato con il feedback ricevuto. A partita conclusa, chiama `apiPost('/api/score', { guesses, timeSeconds })` e mostra `ScoreCard`.

### Partita 1v1

Player 1: lobby → `apiPost('/api/matches', { lang })` → riceve `roomId` → mostra link di invito → apre connessione SignalR e attende Player 2.

Player 2: apre `lemma.app/1v1/{roomId}` → login se necessario → `apiPost('/api/matches/{roomId}/join')` → apre connessione SignalR.

Entrambi: connessione SignalR stabilita, `JoinMatch` inviato → partita inizia → ad ogni tentativo, prima REST poi SignalR → `MatchGrid.tsx` si aggiorna quando arriva `OpponentGuessUpdate` → fine partita su `MatchFinished`.

---

## Cosa NON fa questo layer

- Non accede direttamente a PostgreSQL o Supabase per dati di gioco.
- Non calcola il punteggio.
- Non valida se una parola esiste nel dizionario.
- Non conosce la parola del giorno in nessun momento della partita.
- Non gestisce il cron di sorteggio parole.
- Non usa Supabase Realtime (sostituito da SignalR gestito dal backend .NET).
- Non integra layer AI — i commenti a fine partita non sono parte di questo modulo.

---

## Roadmap frontend

**Fase 1 — Setup:** init Next.js 15 + TypeScript strict + Tailwind con design token lemma. Self-hosting font. Setup `lib/api-client.ts` e `hooks/use-auth.ts`. Verifica flusso JWT con endpoint `.NET` di test.

**Fase 2 — MVP:** `Grid`, `Tile`, `Keyboard` con animazioni flip. `hooks/use-game.ts` completo. Integrazione con `/api/guess` e `/api/score`. `ScoreCard` con punteggio e pattern emoji per condivisione. Deploy su Vercel con `NEXT_PUBLIC_API_URL` puntato al backend Railway.

**Fase 3 — Social:** pagina leaderboard con `Leaderboard.tsx`. Profilo utente con storico partite. PWA: manifest, service worker, supporto offline minimale.

**Fase 4 — 1v1:** `lib/signalr-client.ts` e `hooks/use-match.ts`. Pagina `/1v1/[roomId]` con layout split-screen (`Grid` propria + `MatchGrid` avversario). Gestione disconnessione e riconnessione automatica SignalR.