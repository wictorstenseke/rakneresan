import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { fakeEmail } from './constants'
import type { StorageAdapter, UserData, TableData } from './storage'

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
    return { tables: snap.data().tables ?? {} }
  },

  async saveTableData(_: string, table: number, data: TableData): Promise<void> {
    const uid = requireUid()
    await updateDoc(doc(db, 'users', uid), { [`tables.${table}`]: data })
  },

  async createUser(username: string, pin: string): Promise<void> {
    const cred = await createUserWithEmailAndPassword(auth, fakeEmail(username), pin)
    await setDoc(doc(db, 'users', cred.user.uid), { tables: {} })
  },

  async validatePin(username: string, pin: string): Promise<boolean> {
    try {
      await signInWithEmailAndPassword(auth, fakeEmail(username), pin)
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
