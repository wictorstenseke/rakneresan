# Mattekort / Räkneresan

A math flashcard game for children (**Räkneresan** — "The Math Journey"), primarily designed for iPad. Players practice multiplication tables and arithmetic using a card flip mechanic — correct answers go to the "clear" pile, wrong answers or peeks go to the "retry" pile. Progress is saved per user via Firebase.

## Categories

27 categories across four operations:

- **Multiply** — Tables 1–10, each with a unique color and emoji
- **Add** — Tiokompisar (Ten Friends), Dubbelkompisar (Double Friends), Plus till 20, Lätt hundra
- **Subtract** — Minuskompisar till 10, Minus inom 20, Lätt hundra minus
- **Divide** — Dela med 2, Dela med 3, Dela med 4, Dela med 5

## Tech Stack

- **Vite** – build tool
- **Preact** – UI framework
- **TypeScript** – type safety
- **Tailwind CSS v4** – utility-class styling with safe-area and `dvh` support for iPad/Safari
- **Firebase Auth + Firestore** – authentication and cloud persistence with offline support
- **Vite PWA plugin** – installable as a home screen app
- **@use-gesture/react** – 3D card flip and touch interactions

## Getting Started

```bash
npm install
```

Create a `.env.local` with your Firebase project config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Then start the dev server:

```bash
npm run dev
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest unit tests |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
src/
  components/       NumericKeypad, HintModal, HistoryModal, Modal, ThemeToggle
                    BalanceChip, TopHeader, UserMenuChip
  components/admin/ KategoriTab, VideoTab, StatistikTab, InstallningarTab, PinCell
  pages/            LoginPage, HomePage, GamePage, CompletePage, StatsPage, ShopPage, AdminPage
  hooks/            useGame, useAuth, useTheme, useAdmin
  lib/
    firebase.ts              Firebase init
    storage.ts               StorageAdapter interface + shared types
    storage.firebase.ts      Firebase Firestore adapter (active)
    storage.firebase.admin.ts  Admin operations (bypasses user-scoped rules)
    storageContext.ts        Active adapter export (swap here to change backend)
    game-logic.ts            buildDeck, isCorrectAnswer, computeEndRound
    constants.ts             Shared constants, fakeEmail(), table definitions
    preferences.ts           Keypad hand preference (persisted)
    savedUsers.ts            Recently used credentials (max 6, djb2 color/emoji)
    hint-utils.ts            Multiplication hints (getMultiplyHints, opSymbol)
    youtube.ts               YouTube video title fetching utility
  app.tsx
  main.tsx
  index.css
```

## Architecture

Game logic is built against a `StorageAdapter` abstraction. The active implementation uses Firebase Firestore — swapping backends only requires changing the export in `storageContext.ts`.

### Auth

Username + 4-digit PIN. Credentials are stored in Firebase Auth as `username@matte.kort`. PINs are doubled internally (`pinToPassword`) to meet Firebase's 6-character minimum.

### Screen Flow

Login → Home → Game → Complete → (back to Home or replay)
Home also provides access to Stats and the Shop.
Admins and superusers are redirected to **AdminPage** after login.

### Card Flip

Physical 3D flip animation via `@use-gesture/react`. Peeking at the answer immediately moves the card to the retry pile (core game rule).

### Auto-Flip

After 2 wrong answers on the same card, the card flips automatically and shows the answer for 12 seconds, then moves on.

### Credits & Reward Shop

Players earn credits (⭐) by completing rounds. Credits are displayed in the persistent `BalanceChip` in the top header on all pages. Credits can be spent in the **Shop** (called **Affär** in the UI) to purchase **Kika gratis** items — these allow peeking at a card answer without sending it to the retry pile.

### Kika gratis (Peek Savers)

A Kika gratis item is consumed automatically when a player peeks at a card. Without one, peeking still moves the card to the retry pile (core rule unchanged). Purchased with credits in the Shop.

### Theming

Supports light and dark modes with a toggle. System preference is detected on first load and stored in `localStorage`.

## Admin Panel

Admins and superusers land on **AdminPage** after login. It has five tabs:

### Användare (Users)

- **Superusers** see two sections: Admins and Användare (regular users)
  - Can create new admin accounts (username + 4-digit PIN)
  - Can create new user accounts
- **Admins** see only their own space's users
- Each user row shows their username, total wins, and a PIN display cell

### Kategorier (Categories)

- Toggle which of the 27 categories are active for the space
- Changes propagate automatically to all users in the space (via `spaceConfig`)
- Auto-saves with debounce and shows a success toast

### Videos

- Add YouTube reward videos by URL or video ID
- Each video shows its fetched title and thumbnail
- Videos can be hidden/shown per space — hidden videos won't appear to users

### Inställningar (Settings)

- Toggle **credits** on/off for the entire space
- When disabled, users don't earn or see credits and the Shop is hidden

### Statistik (Statistics)

- Overview of all users in the space: total wins, completed categories, and credit balances

### Multi-tenant (Spaces)

Each admin manages users within their own `spaceId`. A superuser manages all admins and users in their space. Space configuration (`activeCategories`, `creditsEnabled`, `videos`, `hiddenVideos`) is propagated to all users in the space via `spaceConfig/{spaceId}` in Firestore.
