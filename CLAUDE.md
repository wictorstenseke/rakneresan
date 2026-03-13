# CLAUDE.md

Guidelines for Claude Code when working in this repository.

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Type-check + build
npm run typecheck  # TypeScript check only
npm run lint       # ESLint
npm run test       # Run Vitest unit tests
npm run test:watch # Watch mode for tests
```

## Architecture

- **UI**: Preact with functional components and hooks
- **Styling**: Tailwind CSS v4 — use utility classes, no custom CSS unless necessary
- **State**: Local component state + custom hooks (`useGame`, `useAuth`, `useTheme`, `useAdmin`)
- **Storage**: Always use the `storage` export from `src/lib/storageContext.ts` — never access `localStorage` directly in components or hooks
- **Storage caching**: `storageContext.ts` wraps the adapter with a 30s TTL cache layer

## Key Constraints

- **iPad-first**: Touch targets must be at least 44×44px; use `dvh` not `vh`; respect `safe-area-inset-*`
- **Storage adapter pattern**: All data access goes through `StorageAdapter` — never call Firebase directly from components or hooks
- **Peek = retry**: Any card peek must move the card to the retry pile — this is a core game rule (exception: if user has a Peek Saver item, it prevents this)
- **Auto-flip**: After 2+ wrong answers on a card, flip and show answer automatically (12s timer in GamePage)
- **Keypad**: `NumericKeypad` supports left/right-handed mode, persisted via `preferences.ts` — max 3 digits input
- **Theming**: Use CSS custom properties (`--bg`, `--surface`, `--text`, `--tc`, `--tc2`, etc.) for all theme-aware colors — never hardcode light/dark color values. Theme state lives in `useTheme` and is stored in `localStorage`.

## Firebase

- **Auth**: Email/password with fake emails (`username@matte.kort`) via `fakeEmail()` in `constants.ts`
- **PIN → password**: PINs are doubled internally (`pinToPassword`) to meet Firebase's 6-char minimum — never store or expose this mapping
- **Firestore collections**:
  - `users/{uid}` — game data (`tables` map, `completionLog`, `credits`, `peekSavers`, `purchaseCounts`, `activeCategories`, `creditsEnabled`, `spaceVideos`, `hiddenVideos`)
  - `profiles/{uid}` — `UserProfile` with role (`'superuser'|'admin'|'user'`), `spaceId`, pin, createdAt, createdBy
  - `spaceConfig/{spaceId}` — `SpaceConfig` with activeCategories, creditsEnabled, videos
- **Config**: Read from `VITE_FIREBASE_*` env vars — stored in `.env.local` locally, GitHub Actions secrets for CI/deploy
- **Offline**: Firestore uses `persistentLocalCache` + `persistentMultipleTabManager` for PWA/offline support

## User Roles & Admin

- Three roles: `'superuser'` | `'admin'` | `'user'` — stored in `profiles/{uid}`
- Admins and superusers are redirected to `AdminPage` after login
- **AdminPage** (`src/pages/AdminPage.tsx`) has five tabs: Users, Categories, Videos, Settings, Statistics
- **Admin storage**: `src/lib/storage.firebase.admin.ts` — `AdminStorageAdapter` interface with `propagateSpaceConfig()`, `createAdmin()`, etc.
- Admin hook: `src/hooks/useAdmin.ts`
- Admin components live in `src/components/admin/` (`KategoriTab`, `VideoTab`, `StatistikTab`, `InstallningarTab`, `PinCell`)
- **Space/multi-tenant**: Each admin manages users within their `spaceId`; `spaceConfig` propagates to all space users

## Credits & Shop

- Users earn credits by completing tables; spent in the **ShopPage** (`src/pages/ShopPage.tsx`) — UI heading: **Affär**
- **Kika gratis** (code: `peekSavers`): shop item that prevents a peeked card from going to the retry pile
- Credits and purchases tracked in `UserData` (`credits`, `peekSavers`, `purchaseCounts`)
- Reward videos (YouTube) configured by admin per space — utilities in `src/lib/youtube.ts`

## File Conventions

- Pages live in `src/pages/` — includes `LoginPage`, `HomePage`, `GamePage`, `CompletePage`, `StatsPage`, `ShopPage`, `AdminPage`
- Reusable components live in `src/components/`; admin-specific in `src/components/admin/`
- Custom hooks live in `src/hooks/`
- Shared types in `src/lib/storage.ts` (includes `UserProfile`, `SpaceConfig`, `SpaceUser`, `CompletionEntry`, `AdminStorageAdapter`)
- Shared constants in `src/lib/constants.ts` — `fakeEmail()`, colors, emojis, `DIVIDE_CATEGORIES`
- Firebase init in `src/lib/firebase.ts`
- Active storage adapter: `src/lib/storage.firebase.ts` (swap in `src/lib/storageContext.ts`)
- Admin adapter: `src/lib/storage.firebase.admin.ts`
- Game rules & deck logic in `src/lib/game-logic.ts` (`buildDeck`, `isCorrectAnswer`, `computeEndRound`)
- Keypad hand preference in `src/lib/preferences.ts` — also stores active operation tab per user (`home_active_op`)
- Recently used credentials: `src/lib/savedUsers.ts` (max 6 username/pin pairs, djb2 hash for consistent color/emoji)
- YouTube utilities: `src/lib/youtube.ts` (`REWARD_VIDEO_IDS`, `buildEmbedUrl`, `fetchVideoTitle`)
- Hint helpers: `src/lib/hint-utils.ts` (`getMultiplyHints`, `opSymbol`)

## App Branding

- App name: **Räkneresan** (Swedish: "The Math Journey")
- 27 categories across 4 operations:
  - **multiply**: tables 1–10 (each with unique color + emoji)
  - **add**: Tiokompisar, Dubbelkompisar, Plus till 20, Lätt hundra
  - **subtract**: Minuskompisar till 10, Minus inom 20, Lätt hundra minus
  - **divide**: Dela med 2, Dela med 3, Dela med 4, Dela med 5 (IDs 31–34)
- Auth uses fake email domain: `username@matte.kort`
- Screen flow: Login → Home → Game → Complete → (back to Home or replay); Home provides access to Stats and Shop; admins/superusers go to AdminPage
