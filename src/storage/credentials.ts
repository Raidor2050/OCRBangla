/**
 * Client-side credential storage.
 *
 * SECURITY MODEL (be honest about it):
 *  - Credentials live in IndexedDB in the user's own browser. IndexedDB is
 *    origin-scoped and not readable by other origins, but a GitHub Pages site
 *    has no server. This is *not* equivalent to a server-side secrets manager:
 *    any script running on this origin could read the stored value, and the
 *    key is entered by the user for their own use (BYOK).
 *  - We never log, never bundle, never commit, and never transmit stored keys
 *    anywhere except to the provider the user selected, in order to OCR a
 *    document the user explicitly submitted.
 *  - The UI offers "Forget key" and "Forget all keys" controls.
 */

const DB_NAME = 'ordinary-chobi-reader'
const DB_VERSION = 1
const STORE = 'credentials'

export type CredentialMap = Record<string, string>

class CredentialStore {
  private dbPromise: Promise<IDBDatabase> | null = null
  private memoryFallback = new Map<string, string>()
  private useMemory = false

  private open(): Promise<IDBDatabase> {
    if (!('indexedDB' in globalThis) || !globalThis.indexedDB) {
      this.useMemory = true
      return Promise.reject(new Error('indexedDB unavailable'))
    }
    if (this.dbPromise) return this.dbPromise
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
    })
    this.dbPromise.catch(() => {
      this.useMemory = true
    })
    return this.dbPromise
  }

  private tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
    return db.transaction(STORE, mode).objectStore(STORE)
  }

  async get(providerId: string): Promise<string | null> {
    if (this.useMemory) return this.memoryFallback.get(providerId) ?? null
    try {
      const db = await this.open()
      return await new Promise((resolve, reject) => {
        const req = this.tx(db, 'readonly').get(providerId)
        req.onsuccess = () => resolve((req.result as string | undefined) ?? null)
        req.onerror = () => reject(req.error ?? new Error('read failed'))
      })
    } catch (err) {
      if (this.useMemory) return this.memoryFallback.get(providerId) ?? null
      throw err
    }
  }

  async set(providerId: string, value: string): Promise<void> {
    if (this.useMemory) {
      this.memoryFallback.set(providerId, value)
      return
    }
    try {
      const db = await this.open()
      await new Promise<void>((resolve, reject) => {
        const req = this.tx(db, 'readwrite').put(value, providerId)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error ?? new Error('write failed'))
      })
    } catch (err) {
      if (this.useMemory) {
        this.memoryFallback.set(providerId, value)
        return
      }
      throw err
    }
  }

  async delete(providerId: string): Promise<void> {
    if (this.useMemory) {
      this.memoryFallback.delete(providerId)
      return
    }
    try {
      const db = await this.open()
      await new Promise<void>((resolve, reject) => {
        const req = this.tx(db, 'readwrite').delete(providerId)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error ?? new Error('delete failed'))
      })
    } catch (err) {
      if (this.useMemory) {
        this.memoryFallback.delete(providerId)
        return
      }
      throw err
    }
  }

  async clearAll(): Promise<void> {
    if (this.useMemory) {
      this.memoryFallback.clear()
      return
    }
    try {
      const db = await this.open()
      await new Promise<void>((resolve, reject) => {
        const req = this.tx(db, 'readwrite').clear()
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error ?? new Error('clear failed'))
      })
    } catch (err) {
      if (this.useMemory) {
        this.memoryFallback.clear()
        return
      }
      throw err
    }
  }

  async all(): Promise<CredentialMap> {
    if (this.useMemory) return Object.fromEntries(this.memoryFallback)
    try {
      const db = await this.open()
      return await new Promise((resolve, reject) => {
        const req = this.tx(db, 'readonly').getAll()
        const keysReq = this.tx(db, 'readonly').getAllKeys()
        req.onsuccess = () => {
          const values = (req.result ?? []) as string[]
          const keys = (keysReq.result ?? []) as string[]
          const map: CredentialMap = {}
          keys.forEach((k, i) => {
            map[k] = values[i] ?? ''
          })
          resolve(map)
        }
        req.onerror = () => reject(req.error ?? new Error('getAll failed'))
      })
    } catch (err) {
      if (this.useMemory) return Object.fromEntries(this.memoryFallback)
      throw err
    }
  }
}

/** Shared singleton.
 *  This store is small and used across multiple pages, so instantiate once.
 */
export const credentialStore = new CredentialStore()

// Convenience exports matching the provider IDs used by the registry.
export async function hasCredential(providerId: string): Promise<boolean> {
  return (await credentialStore.get(providerId)) != null
}

export function maskSecret(secret: string): string {
  if (!secret) return ''
  if (secret.length <= 6) return '••••••'
  return secret.slice(0, 4) + '••••••••' + secret.slice(-2)
}

/** In-memory variant useful for tests and SSR-safe code paths. */
export function createMemoryCredentialStore() {
  const map = new Map<string, string>()
  return {
    get: (id: string) => Promise.resolve(map.get(id) ?? null),
    set: (id: string, v: string) => {
      map.set(id, v)
      return Promise.resolve()
    },
    delete: (id: string) => {
      map.delete(id)
      return Promise.resolve()
    },
    clearAll: () => {
      map.clear()
      return Promise.resolve()
    },
    all: () => Promise.resolve(Object.fromEntries(map)),
  }
}