import { getFirebaseAuth, getFirebaseDb } from './firebase'
import { fakeEmail } from './constants'
import { readDoc, queueWrite } from './firestoreOffline'
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
    const { doc, updateDoc } = await import('firebase/firestore')
    const snap = await readDoc(doc(db, 'users', uid))
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
        queueWrite(updateDoc(snap.ref, { completionLog: backfill, backfillDone: true }), 'backfill')
        data.completionLog = backfill
      } else {
        queueWrite(updateDoc(snap.ref, { backfillDone: true }), 'backfill')
      }
    }
    return {
      tables: data.tables ?? {},
      completionLog: data.completionLog ?? [],
      credits: data.credits ?? 0,
      peekSavers: data.peekSavers ?? 0,
      purchaseCounts: data.purchaseCounts ?? {},
      activeCategories: data.activeCategories ?? null,
      creditsEnabled: data.creditsEnabled ?? true,
      spaceVideos: data.spaceVideos ?? {},
      hiddenVideos: data.hiddenVideos ?? [],
    }
  },

  async saveTableData(_: string, table: number, data: TableData): Promise<void> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { doc, updateDoc } = await import('firebase/firestore')
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
    queueWrite(updateDoc(doc(db, 'users', uid), { [`tables.${table}`]: clean }), 'saveTableData')
  },

  async createUser(username: string, pin: string): Promise<void> {
    const auth = await getFirebaseAuth()
    const { createUserWithEmailAndPassword } = await import('firebase/auth')
    const db = await getFirebaseDb()
    const { doc, writeBatch, serverTimestamp } = await import('firebase/firestore')
    const cred = await createUserWithEmailAndPassword(auth, fakeEmail(username), pinToPassword(pin))
    const uid = cred.user.uid
    const batch = writeBatch(db)
    batch.set(doc(db, 'users', uid), { tables: {}, credits: 0, peekSavers: 0, purchaseCounts: {} })
    batch.set(doc(db, 'profiles', uid), {
      uid,
      username,
      role: 'user',
      spaceId: null,
      pin,
      createdAt: serverTimestamp(),
      createdBy: 'self',
    })
    batch.set(doc(db, 'usernames', username), { uid })
    await batch.commit()
  },

  async logCompletion(_: string, table: number): Promise<void> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { arrayUnion, doc, updateDoc } = await import('firebase/firestore')
    const entry: CompletionEntry = { table, timestamp: Date.now() }
    queueWrite(updateDoc(doc(db, 'users', uid), {
      completionLog: arrayUnion(entry),
    }), 'logCompletion')
  },

  async saveCompletedRound(_: string, table: number, data: TableData): Promise<void> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { arrayUnion, doc, updateDoc } = await import('firebase/firestore')
    const entry: CompletionEntry = { table, timestamp: Date.now() }
    queueWrite(updateDoc(doc(db, 'users', uid), {
      [`tables.${table}`]: data,
      completionLog: arrayUnion(entry),
    }), 'saveCompletedRound')
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

  async addCredits(_: string, amount: number): Promise<void> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { doc, increment, updateDoc } = await import('firebase/firestore')
    queueWrite(updateDoc(doc(db, 'users', uid), { credits: increment(amount) }), 'addCredits')
  },

  async addPeekSavers(_: string, amount: number): Promise<void> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { doc, increment, updateDoc } = await import('firebase/firestore')
    queueWrite(updateDoc(doc(db, 'users', uid), { peekSavers: increment(amount) }), 'addPeekSavers')
  },

  async consumePeekSaver(_: string): Promise<boolean> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { doc, increment, updateDoc } = await import('firebase/firestore')
    const ref = doc(db, 'users', uid)
    const snap = await readDoc(ref)
    if (!snap.exists()) return false
    const current = snap.data().peekSavers ?? 0
    if (current <= 0) return false
    queueWrite(updateDoc(ref, { peekSavers: increment(-1) }), 'consumePeekSaver')
    return true
  },

  async spendCreditsAndTrackPurchase(_: string, cost: number, itemId: string): Promise<boolean> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { doc, increment, updateDoc } = await import('firebase/firestore')
    const ref = doc(db, 'users', uid)
    const snap = await readDoc(ref)
    if (!snap.exists()) return false
    const current = snap.data().credits ?? 0
    if (current < cost) return false
    queueWrite(updateDoc(ref, {
      credits: increment(-cost),
      [`purchaseCounts.${itemId}`]: increment(1),
    }), 'spendCreditsAndTrackPurchase')
    return true
  },
}
