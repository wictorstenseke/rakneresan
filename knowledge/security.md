# Security

## PIN in localStorage — intentional tradeoff

- PINs are stored in `localStorage` (via `savedUsers.ts`) so multiple users can switch accounts on the same device
- This is a **known, accepted tradeoff** — do not flag it as a bug or try to fix it without explicit instruction
- May be revisited in the future, but not a current priority

## Auth model

- Fake email domain (`username@matte.kort`) — users never see or enter email addresses
- PINs doubled internally (`pinToPassword`) to meet Firebase 6-char minimum — never expose this mapping
- Login flow: tries `createUser` first; catches `auth/email-already-in-use` then falls back to `validatePin`
