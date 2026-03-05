# CLAUDE.md

Guidelines for Claude Code when working in this repository.

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Type-check + build
npm run typecheck  # TypeScript check only
npm run lint       # ESLint
```

## Architecture

- **UI**: Preact with functional components and hooks
- **Styling**: Tailwind CSS v4 — use utility classes, no custom CSS unless necessary
- **State**: Local component state + custom hooks (`useGame`, `useAuth`)
- **Storage**: Always use the `storage` export from `src/lib/storageContext.ts` — never access `localStorage` directly in components or hooks

## Key Constraints

- **iPad-first**: Touch targets must be at least 44×44px; use `dvh` not `vh`; respect `safe-area-inset-*`
- **Storage adapter pattern**: All data access goes through `StorageAdapter` — never call Firebase directly from components or hooks
- **Peek = retry**: Any card peek must move the card to the retry pile — this is a core game rule

## Firebase

- **Auth**: Email/password with fake emails (`username@matte.kort`) via `fakeEmail()` in `constants.ts`
- **PIN → password**: PINs are doubled internally (`pinToPassword`) to meet Firebase's 6-char minimum — never store or expose this mapping
- **Firestore**: Single doc per user at `users/{uid}` with a `tables` map. Security rules ensure users can only access their own doc.
- **Config**: Read from `VITE_FIREBASE_*` env vars — stored in `.env.local` locally, GitHub Actions secrets for CI/deploy
- **Offline**: Firestore uses `persistentLocalCache` + `persistentMultipleTabManager` for PWA/offline support

## File Conventions

- Pages live in `src/pages/`
- Reusable components live in `src/components/`
- Custom hooks live in `src/hooks/`
- Shared types in `src/lib/storage.ts`
- Shared constants in `src/lib/constants.ts`
- Firebase init in `src/lib/firebase.ts`
- Active storage adapter: `src/lib/storage.firebase.ts` (swap in `src/lib/storageContext.ts`)
