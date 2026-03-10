import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
}

let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _db: Firestore | null = null

async function getApp(): Promise<FirebaseApp> {
  if (_app) return _app
  const { initializeApp } = await import('firebase/app')
  _app = initializeApp(firebaseConfig)
  return _app
}

export async function getFirebaseAuth(): Promise<Auth> {
  if (_auth) return _auth
  const app = await getApp()
  const { getAuth, setPersistence, browserLocalPersistence } = await import('firebase/auth')
  _auth = getAuth(app)
  await setPersistence(_auth, browserLocalPersistence)
  return _auth
}

export async function getFirebaseDb(): Promise<Firestore> {
  if (_db) return _db
  const app = await getApp()
  const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = await import('firebase/firestore')
  _db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  return _db
}
