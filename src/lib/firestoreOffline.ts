import type { DocumentReference, DocumentSnapshot } from 'firebase/firestore'

/** How long to wait for the server before falling back to the local cache. */
export const SERVER_READ_TIMEOUT_MS = 2500

/**
 * Read a document, preferring the server but falling back to Firestore's
 * persistent local cache when offline or when the server is slow to respond.
 * Plain `getDoc` can hang for ~10s (or fail) without a connection.
 */
export async function readDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
  const { getDoc, getDocFromCache } = await import('firebase/firestore')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    try {
      return await getDocFromCache(ref)
    } catch {
      // Not cached yet — let getDoc try anyway
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>(resolve => {
    timer = setTimeout(() => resolve('timeout'), SERVER_READ_TIMEOUT_MS)
  })
  try {
    const result = await Promise.race([getDoc(ref), timeout])
    if (result !== 'timeout') return result
  } catch (err) {
    try {
      return await getDocFromCache(ref)
    } catch {
      throw err
    }
  } finally {
    clearTimeout(timer)
  }
  return getDocFromCache(ref)
}

/**
 * Firestore applies writes to the local cache immediately, but the returned
 * promise only resolves once the server acknowledges it — which never happens
 * offline. Don't await it; queue it and log failures instead.
 */
export function queueWrite(write: Promise<unknown>, label: string): void {
  write.catch(err => {
    console.error(`[offline] write failed: ${label}`, err)
  })
}
