import { getFirebaseAuth, getFirebaseDb } from './firebase'
import { fakeEmail } from './constants'
import { readDoc } from './firestoreOffline'
import type { AdminStorageAdapter, UserProfile, SpaceConfig, SpaceUser, UserData } from './storage'

function pinToPassword(pin: string): string {
  return pin + pin
}

async function requireUid(): Promise<string> {
  const auth = await getFirebaseAuth()
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Not authenticated')
  return uid
}

export const firebaseAdminStorageAdapter: AdminStorageAdapter = {
  async getMyProfile(): Promise<UserProfile | null> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { doc } = await import('firebase/firestore')
    const snap = await readDoc(doc(db, 'profiles', uid))
    if (!snap.exists()) return null
    const d = snap.data()
    return {
      uid,
      username: d.username,
      role: d.role,
      spaceId: d.spaceId ?? null,
      pin: d.pin ?? '',
      createdAt: d.createdAt?.toMillis?.() ?? Date.now(),
      createdBy: d.createdBy ?? 'self',
    }
  },

  async listSpaceUsers(): Promise<SpaceUser[]> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore')
    const q = query(collection(db, 'profiles'), where('spaceId', '==', uid))
    const snaps = await getDocs(q)
    const results: SpaceUser[] = []
    for (const snap of snaps.docs) {
      const d = snap.data()
      const profile: UserProfile = {
        uid: snap.id,
        username: d.username,
        role: d.role,
        spaceId: d.spaceId ?? null,
        pin: d.pin ?? '',
        createdAt: d.createdAt?.toMillis?.() ?? Date.now(),
        createdBy: d.createdBy ?? 'self',
      }
      const userSnap = await getDoc(doc(db, 'users', snap.id))
      const gameData: UserData | null = userSnap.exists()
        ? {
            tables: userSnap.data().tables ?? {},
            completionLog: userSnap.data().completionLog ?? [],
            credits: userSnap.data().credits ?? 0,
            peekSavers: userSnap.data().peekSavers ?? 0,
            purchaseCounts: userSnap.data().purchaseCounts ?? {},
          }
        : null
      results.push({ uid: snap.id, username: d.username, profile, gameData })
    }
    return results
  },

  async createSpaceUser(username: string, pin: string): Promise<void> {
    const adminUid = await requireUid()
    const auth = await getFirebaseAuth()
    const { createUserWithEmailAndPassword } = await import('firebase/auth')
    const db = await getFirebaseDb()
    const { doc, writeBatch, serverTimestamp } = await import('firebase/firestore')

    // Create Firebase Auth user — this also signs them in, so we need to re-sign-in as admin after
    const adminEmail = auth.currentUser?.email
    const adminUser = auth.currentUser

    const cred = await createUserWithEmailAndPassword(auth, fakeEmail(username), pinToPassword(pin))
    const newUid = cred.user.uid

    // Write profile, user doc, and username mapping
    const batch = writeBatch(db)
    batch.set(doc(db, 'users', newUid), { tables: {}, credits: 0, peekSavers: 0, purchaseCounts: {} })
    batch.set(doc(db, 'profiles', newUid), {
      uid: newUid,
      username,
      role: 'user',
      spaceId: adminUid,
      pin,
      createdAt: serverTimestamp(),
      createdBy: adminUid,
    })
    batch.set(doc(db, 'usernames', username), { uid: newUid })
    await batch.commit()

    // Sign back in as admin using their stored credentials
    // We need the admin's email and we re-authenticate them
    // Since we can't store admin PIN here, we use updateCurrentUser to restore
    if (adminUser && adminEmail) {
      const { updateCurrentUser } = await import('firebase/auth')
      await updateCurrentUser(auth, adminUser)
    }
  },

  async getSpaceConfig(): Promise<SpaceConfig | null> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { doc, getDoc, setDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(db, 'spaces', uid))
    if (!snap.exists()) return null
    const d = snap.data()
    // Keep superuser's own users doc in sync with current video config
    // so their ShopPage always reflects the latest state
    await setDoc(doc(db, 'users', uid), {
      spaceVideos: d.videos ?? {},
      hiddenVideos: d.hiddenVideos ?? [],
    }, { merge: true })
    return {
      adminUid: d.adminUid,
      adminUsername: d.adminUsername,
      activeCategories: d.activeCategories ?? null,
      creditsEnabled: d.creditsEnabled ?? true,
      videos: d.videos ?? {},
      hiddenVideos: d.hiddenVideos ?? [],
    }
  },

  async updateSpaceConfig(config: Partial<SpaceConfig>): Promise<void> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
    const ref = doc(db, 'spaces', uid)
    await setDoc(ref, { ...config, adminUid: uid, createdAt: serverTimestamp() }, { merge: true })
  },

  async propagateSpaceConfig(
    fields: Pick<UserData, 'activeCategories' | 'creditsEnabled' | 'spaceVideos' | 'hiddenVideos'>
  ): Promise<void> {
    const uid = await requireUid()
    const db = await getFirebaseDb()
    const { collection, query, where, getDocs, doc, writeBatch, deleteField } = await import('firebase/firestore')

    const userQuery = query(
      collection(db, 'profiles'),
      where('spaceId', '==', uid)
    )
    const userSnaps = await getDocs(userQuery)

    // Firestore batch limit is 500 writes
    const batchSize = 499
    let batch = writeBatch(db)
    let count = 0

    for (const snap of userSnaps.docs) {
      const role = snap.data().role as string | undefined
      if (role === 'admin' || role === 'superuser') continue
      batch.set(doc(db, 'users', snap.id), fields, { merge: true })
      count++
      if (count % batchSize === 0) {
        await batch.commit()
        batch = writeBatch(db)
      }
    }

    // Clear activeCategories from admin docs to remove any stale superuser data
    if ('activeCategories' in fields) {
      const adminQuery = query(
        collection(db, 'profiles'),
        where('spaceId', '==', uid),
        where('role', '==', 'admin')
      )
      const adminSnaps = await getDocs(adminQuery)
      for (const snap of adminSnaps.docs) {
        batch.set(doc(db, 'users', snap.id), { activeCategories: deleteField() }, { merge: true })
        count++
        if (count % batchSize === 0) {
          await batch.commit()
          batch = writeBatch(db)
        }
      }
    }

    await batch.commit()

    // Also write video fields to the caller's own users doc (superuser sees their own shop)
    const ownVideoFields: Record<string, unknown> = {}
    if ('spaceVideos' in fields) ownVideoFields.spaceVideos = fields.spaceVideos
    if ('hiddenVideos' in fields) ownVideoFields.hiddenVideos = fields.hiddenVideos
    if (Object.keys(ownVideoFields).length > 0) {
      const { setDoc } = await import('firebase/firestore')
      await setDoc(doc(db, 'users', uid), ownVideoFields, { merge: true })
    }
  },

  async listAdmins(): Promise<UserProfile[]> {
    const db = await getFirebaseDb()
    const { collection, query, where, getDocs } = await import('firebase/firestore')
    const q = query(collection(db, 'profiles'), where('role', '==', 'admin'))
    const snaps = await getDocs(q)
    return snaps.docs.map(snap => {
      const d = snap.data()
      return {
        uid: snap.id,
        username: d.username,
        role: d.role,
        spaceId: d.spaceId ?? null,
        pin: d.pin ?? '',
        createdAt: d.createdAt?.toMillis?.() ?? Date.now(),
        createdBy: d.createdBy ?? 'self',
      }
    })
  },

  async createAdmin(username: string, pin: string): Promise<void> {
    const superUid = await requireUid()
    const auth = await getFirebaseAuth()
    const { createUserWithEmailAndPassword } = await import('firebase/auth')
    const db = await getFirebaseDb()
    const { doc, writeBatch, serverTimestamp } = await import('firebase/firestore')

    const adminUser = auth.currentUser

    const cred = await createUserWithEmailAndPassword(auth, fakeEmail(username), pinToPassword(pin))
    const newUid = cred.user.uid

    const batch = writeBatch(db)
    batch.set(doc(db, 'users', newUid), { tables: {}, credits: 0, peekSavers: 0, purchaseCounts: {} })
    batch.set(doc(db, 'profiles', newUid), {
      uid: newUid,
      username,
      role: 'admin',
      spaceId: superUid,
      pin,
      createdAt: serverTimestamp(),
      createdBy: superUid,
    })
    batch.set(doc(db, 'usernames', username), { uid: newUid })
    batch.set(doc(db, 'spaces', newUid), {
      adminUid: newUid,
      adminUsername: username,
      activeCategories: null,
      creditsEnabled: true,
      videos: {},
      createdAt: serverTimestamp(),
    })
    await batch.commit()

    if (adminUser) {
      const { updateCurrentUser } = await import('firebase/auth')
      await updateCurrentUser(auth, adminUser)
    }
  },
}
