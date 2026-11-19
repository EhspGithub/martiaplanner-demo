/**
 * MartiaPlanner — Resilient Storage Layer
 *
 * Works seamlessly across HTTP/HTTPS web browsers, Tauri 2 (Windows .exe & Android .apk),
 * and standalone Single-File HTML opened via file:// or Android content:// URIs.
 * Falls back gracefully to an in-memory store if browser storage is restricted.
 */

const memoryStorageFallback = new Map<string, string>();

let localStorageAvailableCache: boolean | null = null;

export function isLocalStorageAvailable(): boolean {
  if (localStorageAvailableCache !== null) {
    return localStorageAvailableCache;
  }
  if (typeof window === 'undefined') {
    localStorageAvailableCache = false;
    return false;
  }
  try {
    const probeKey = '__martia_storage_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    localStorageAvailableCache = true;
    return true;
  } catch {
    localStorageAvailableCache = false;
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  if (typeof window !== 'undefined') {
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) {
        memoryStorageFallback.set(key, val);
        return val;
      }
    } catch {
      // Fallback below
    }
  }
  return memoryStorageFallback.get(key) ?? null;
}

export function safeSetItem(key: string, value: string): boolean {
  memoryStorageFallback.set(key, value);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function safeRemoveItem(key: string): void {
  memoryStorageFallback.delete(key);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

export function safeGetKeysWithPrefix(prefix: string): Array<{ key: string; value: string }> {
  const results = new Map<string, string>();
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          const val = window.localStorage.getItem(k);
          if (val !== null) {
            results.set(k, val);
          }
        }
      }
    } catch {
      // Fallback to memoryStorageFallback
    }
  }
  for (const [k, v] of memoryStorageFallback.entries()) {
    if (k.startsWith(prefix) && !results.has(k)) {
      results.set(k, v);
    }
  }
  return Array.from(results.entries()).map(([key, value]) => ({ key, value }));
}

export function safeRemoveKeysWithPrefix(prefix: string): void {
  if (typeof window !== 'undefined') {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          toRemove.push(k);
        }
      }
      for (const k of toRemove) {
        window.localStorage.removeItem(k);
      }
    } catch {
      // ignore
    }
  }
  for (const k of Array.from(memoryStorageFallback.keys())) {
    if (k.startsWith(prefix)) {
      memoryStorageFallback.delete(k);
    }
  }
}

export function getEmbeddedBackupSnapshot(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const winAny = window as any;
    if (winAny.__MARTIA_EMBEDDED_BACKUP__ && typeof winAny.__MARTIA_EMBEDDED_BACKUP__ === 'object') {
      return winAny.__MARTIA_EMBEDDED_BACKUP__;
    }
    const scriptEl = document.getElementById('martia-embedded-backup');
    if (scriptEl && scriptEl.textContent) {
      const parsed = JSON.parse(scriptEl.textContent);
      winAny.__MARTIA_EMBEDDED_BACKUP__ = parsed;
      return parsed;
    }
  } catch {
    // ignore malformed embedded script
  }
  return null;
}

export function getStorageDiagnostics(): {
  protocol: string;
  isStandaloneSingleFile: boolean;
  isContentUri: boolean;
  isLocalStoragePersistent: boolean;
} {
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  const isSingleFileFlag =
    typeof window !== 'undefined' &&
    Boolean((window as any).__MARTIA_SINGLEFILE_MODE__ || protocol === 'file:');
  return {
    protocol,
    isStandaloneSingleFile: isSingleFileFlag,
    isContentUri: protocol === 'content:',
    isLocalStoragePersistent: isLocalStorageAvailable(),
  };
}
