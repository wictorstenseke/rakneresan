import { getFirebaseAuth, getFirebaseDb } from './firebase'
import { fakeEmail } from './constants'
import type { StorageAdapter, UserData, TableData, CompletionEntry } from './storage'

/** Firebase requires passwords >= 6 chars; PINs are 4 digits so we double them. */
function pinToPassword(pin: string): string {
  return pin + pin
}

async function requireUid(): Promise<string> {
  const auth = await getFirebaseAuth()
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Not authenticated')
  return uid
}

export const firebaseStorageAdapter: StorageAdapter = {
  async getUser(_: string): Promise<UserData | null> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { doc, getDoc, updateDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    const data = snap.data()
    if (!data.backfillDone && (!data.completionLog || data.completionLog.length === 0)) {
      const backfill: CompletionEntry[] = []
      for (const [tStr, td] of Object.entries(data.tables ?? {})) {
        const t = Number(tStr)
        const wins = (td as TableData).wins ?? 0
        for (let i = 0; i < wins; i++) {
          backfill.push({ table: t, timestamp: Date.now() })
        }
      }
      if (backfill.length > 0) {
        await updateDoc(snap.ref, { completionLog: backfill, backfillDone: true })
        data.completionLog = backfill
      } else {
        await updateDoc(snap.ref, { backfillDone: true })
      }
    }
    return { tables: data.tables ?? {}, completionLog: data.completionLog ?? [] }
  },

  async saveTableData(_: string, table: number, data: TableData): Promise<void> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { doc, updateDoc } = await import('firebase/firestore')
    await updateDoc(doc(db, 'users', uid), { [`tables.${table}`]: data })
  },

  async createUser(username: string, pin: string): Promise<void> {
    const auth = await getFirebaseAuth()
    const { createUserWithEmailAndPassword } = await import('firebase/auth')
    const db = await getFirebaseDb()
    const { doc, setDoc } = await import('firebase/firestore')
    const cred = await createUserWithEmailAndPassword(auth, fakeEmail(username), pinToPassword(pin))
    await setDoc(doc(db, 'users', cred.user.uid), { tables: {} })
  },

  async logCompletion(_: string, table: number): Promise<void> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { arrayUnion, doc, updateDoc } = await import('firebase/firestore')
    const entry: CompletionEntry = { table, timestamp: Date.now() }
    await updateDoc(doc(db, 'users', uid), {
      completionLog: arrayUnion(entry),
    })
  },

  async saveCompletedRound(_: string, table: number, data: TableData): Promise<void> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { arrayUnion, doc, updateDoc } = await import('firebase/firestore')
    const entry: CompletionEntry = { table, timestamp: Date.now() }
    await updateDoc(doc(db, 'users', uid), {
      [`tables.${table}`]: data,
      completionLog: arrayUnion(entry),
    })
  },

  async validatePin(username: string, pin: string): Promise<boolean> {
    const auth = await getFirebaseAuth()
    const { signInWithEmailAndPassword } = await import('firebase/auth')
    try {
      await signInWithEmailAndPassword(auth, fakeEmail(username), pinToPassword(pin))
      return true
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
        return false
      }
      throw err
    }
  },
}
