import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { arrayUnion, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { fakeEmail } from './constants'
import type { StorageAdapter, UserData, TableData, CompletionEntry } from './storage'

/** Firebase requires passwords ≥ 6 chars; PINs are 4 digits so we double them. */
function pinToPassword(pin: string): string {
  return pin + pin
}

function requireUid(): string {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Not authenticated')
  return uid
}

export const firebaseStorageAdapter: StorageAdapter = {
  async getUser(_: string): Promise<UserData | null> {
    const uid = requireUid()
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    const data = snap.data()
    if (!data.completionLog || data.completionLog.length === 0) {
      const backfill: CompletionEntry[] = []
      for (const [tStr, td] of Object.entries(data.tables ?? {})) {
        const t = Number(tStr)
        const wins = (td as TableData).wins ?? 0
        for (let i = 0; i < wins; i++) {
          backfill.push({ table: t, timestamp: Date.now() })
        }
      }
      if (backfill.length > 0) {
        await updateDoc(snap.ref, { completionLog: backfill })
        data.completionLog = backfill
      }
    }
    return { tables: data.tables ?? {}, completionLog: data.completionLog ?? [] }
  },

  async saveTableData(_: string, table: number, data: TableData): Promise<void> {
    const uid = requireUid()
    await updateDoc(doc(db, 'users', uid), { [`tables.${table}`]: data })
  },

  async createUser(username: string, pin: string): Promise<void> {
    const cred = await createUserWithEmailAndPassword(auth, fakeEmail(username), pinToPassword(pin))
    await setDoc(doc(db, 'users', cred.user.uid), { tables: {} })
  },

  async logCompletion(_: string, table: number): Promise<void> {
    const uid = requireUid()
    const entry: CompletionEntry = { table, timestamp: Date.now() }
    await updateDoc(doc(db, 'users', uid), {
      completionLog: arrayUnion(entry),
    })
  },

  async validatePin(username: string, pin: string): Promise<boolean> {
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
