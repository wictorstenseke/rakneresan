
# Mattekort – Project Setup Prompt

## Project Overview

A math flashcard game for children, primarily used on iPad. Players practice multiplication tables 1–10. Cards go into a “clear” pile on correct answers, or a “retry” pile on wrong answers or if the player peeks at the answer. Progress is saved per user.

## Tech Stack

- **Vite** – build tool
- **Preact** – UI framework
- **TypeScript** – type safety
- **Tailwind CSS** – styling (with safe-area and dvh support for iPad/Safari)
- **Firebase Auth + Firestore** – installed and configured but NOT yet used
- **Vite PWA plugin** – offline support + “add to home screen”
- **@use-gesture/react** – card flip and touch interactions

-----

## Setup Instructions

### 1. Initialize the project

```bash
npm create vite@latest mattekort -- --template preact-ts
cd mattekort
npm install
```

### 2. Install all dependencies

```bash
npm install firebase @use-gesture/react
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
npx tailwindcss init -p
```

### 3. Configure Tailwind

In `tailwind.config.js`:

```js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

In `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4. Configure Vite PWA plugin

In `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mattekort',
        short_name: 'Mattekort',
        theme_color: '#FFF9F0',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

-----

## Firebase Setup (installed but not yet active)

### 5. Create Firebase config file

Create `src/lib/firebase.ts`:

```ts
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
})
```

> Firebase is initialized here but auth and db are not called anywhere yet.

-----

## Storage Abstraction Layer (critical)

### 6. Create a storage interface

This is the most important architectural decision. Build all game logic against this interface — localStorage now, Firebase later with zero changes to game code.

Create `src/lib/storage.ts`:

```ts
export interface TableData {
  wins: number
  clear: number[]
  retry: number[]
}

export interface UserData {
  tables: Record<number, TableData>
}

export interface StorageAdapter {
  getUser(username: string): Promise<UserData | null>
  saveTableData(username: string, table: number, data: TableData): Promise<void>
  createUser(username: string, pin: string): Promise<void>
  validatePin(username: string, pin: string): Promise<boolean>
}
```

### 7. Create the localStorage adapter

Create `src/lib/storage.local.ts`:

```ts
import type { StorageAdapter, UserData, TableData } from './storage'

const KEY = 'mattekort_db'

function loadAll(): Record<string, { pin: string; tables: Record<number, TableData> }> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function saveAll(data: ReturnType<typeof loadAll>) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export const localStorageAdapter: StorageAdapter = {
  async getUser(username) {
    const all = loadAll()
    if (!all[username]) return null
    return { tables: all[username].tables || {} }
  },
  async saveTableData(username, table, data) {
    const all = loadAll()
    if (!all[username]) return
    all[username].tables[table] = data
    saveAll(all)
  },
  async createUser(username, pin) {
    const all = loadAll()
    all[username] = { pin, tables: {} }
    saveAll(all)
  },
  async validatePin(username, pin) {
    const all = loadAll()
    return all[username]?.pin === pin
  },
}
```

### 8. Create a storage context

Create `src/lib/storageContext.ts`:

```ts
import { localStorageAdapter } from './storage.local'
import type { StorageAdapter } from './storage'

// To switch to Firebase later, replace this import and swap the adapter
export const storage: StorageAdapter = localStorageAdapter
```

> When Firebase is ready, create `src/lib/storage.firebase.ts` with the same interface and swap it in `storageContext.ts`. Game code never changes.

-----

## Folder Structure

```
src/
  components/       ← UI components (Card, NumPad, PileBar, etc.)
  pages/            ← Login, Home, Game, Complete
  hooks/            ← useGame, useAuth, etc.
  lib/
    firebase.ts     ← Firebase init (inactive)
    storage.ts      ← Interface/types
    storage.local.ts  ← localStorage adapter
    storageContext.ts ← Active adapter export
  types/
    index.ts
  app.tsx
  main.tsx
  index.css
```

-----

## Key Design Decisions to Respect

- **iPad-first**: Touch targets min 44×44px, use `dvh` not `vh`, respect `safe-area-inset`
- **Auth**: Username + 4-digit PIN → stored as `username@mattekort.fake` when Firebase Auth is wired up
- **Card flip**: Physical 3D flip animation via `@use-gesture/react` — peeking auto-moves card to retry pile
- **Input**: Number pad buttons (primary) + keyboard input (secondary, for desktop)
- **Offline**: Firestore offline persistence already configured for when Firebase is activated
