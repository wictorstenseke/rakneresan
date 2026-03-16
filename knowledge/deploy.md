# Deploy

## CI/CD (GitHub Actions)

- Pipeline: `.github/workflows/` — triggers on push/PR to `main`
- Steps: `typecheck` → `lint` → `test` (parallel matrix) → `build` → deploy
- Path filter: only builds/deploys when `src/**`, `index.html`, `public/**`, or config files change
- Target: **GitHub Pages** — this is production
- Firebase config injected via GitHub Actions secrets (`VITE_FIREBASE_*`)

## Firebase Rules

- **Manual deploy** via CLI: `firebase deploy --only firestore:rules`
- Rules live in `firestore.rules`
- No CI automation for rules deploy — do this explicitly when rules change

## Scripts

- `scripts/seed-superuser.mjs` — one-off script used to set superuser role; likely no longer needed
- `scripts/generate-icons.mjs` — generates PWA icons from source
