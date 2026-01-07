// Chrome storage utilities with type safety

const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_ID: 'userId',
  SETTINGS: 'settings'
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

interface StorageValue<T = unknown> {
  value: T;
  timestamp?: number;
}

/**
 * Get a value from chrome.storage.local
 */
export async function get<T>(key: StorageKey): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key);
  if (result[key] !== undefined) {
    try {
      const parsed = JSON.parse(result[key] as string) as StorageValue<T>;
      return parsed.value;
    } catch {
      return result[key] as T;
    }
  }
  return undefined;
}

/**
 * Set a value in chrome.storage.local
 */
export async function set<T>(key: StorageKey, value: T): Promise<void> {
  const storageValue: StorageValue<T> = {
    value,
    timestamp: Date.now()
  };
  await chrome.storage.local.set({
    [key]: JSON.stringify(storageValue)
  });
}

/**
 * Remove a key from chrome.storage.local
 */
export async function remove(key: StorageKey): Promise<void> {
  await chrome.storage.local.remove(key);
}

/**
 * Clear all storage
 */
export async function clear(): Promise<void> {
  await chrome.storage.local.clear();
}

/**
 * Get auth token
 */
export async function getAuthToken(): Promise<string | undefined> {
  return get<string>(STORAGE_KEYS.AUTH_TOKEN);
}

/**
 * Set auth token
 */
export async function setAuthToken(token: string): Promise<void> {
  return set(STORAGE_KEYS.AUTH_TOKEN, token);
}

/**
 * Remove auth token (logout)
 */
export async function removeAuthToken(): Promise<void> {
  return remove(STORAGE_KEYS.AUTH_TOKEN);
}

export { STORAGE_KEYS };
