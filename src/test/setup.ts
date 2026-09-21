import '@testing-library/jest-dom/vitest'

// jsdom lacks full canvas/OffscreenCanvas; provide minimal stubs where tests exercise them.
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// IndexedDB is not available in jsdom. Tests that need it use the in-memory fallback,
// which is exercised here by faking a tiny subset when a real implementation is absent.
if (typeof globalThis.indexedDB === 'undefined') {
  // @ts-expect-error intentionally minimal stub kept out of global TS lib
  globalThis.indexedDB = undefined
}