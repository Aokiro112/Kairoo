/**
 * Persistent First-Party Device Identifier (Frontend)
 *
 * Provides a resilient, permanent device identifier that survives:
 * - Google account sign-ins, logouts, and account switches
 * - Browser tab close and page refreshes
 * - Session storage resets
 *
 * Synchronized across localStorage, sessionStorage, and first-party cookies.
 */

const DEVICE_STORAGE_KEY = 'kairo_device_id';

function generateClientDeviceToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `kdt_${crypto.randomUUID().replace(/-/g, '')}`;
  }
  const rand1 = Math.random().toString(36).substring(2);
  const rand2 = Math.random().toString(36).substring(2);
  const ts = Date.now().toString(36);
  return `kdt_${rand1}${rand2}${ts}`;
}

export function getPersistentDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'kdt_ssr_default_identifier';
  }

  let deviceId: string | null = null;

  // 1. Check localStorage
  try {
    const local = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (local && local.trim().length >= 12) {
      deviceId = local.trim();
    }
  } catch {}

  // 2. Check sessionStorage
  if (!deviceId) {
    try {
      const session = sessionStorage.getItem(DEVICE_STORAGE_KEY);
      if (session && session.trim().length >= 12) {
        deviceId = session.trim();
      }
    } catch {}
  }

  // 3. Check document.cookie
  if (!deviceId) {
    try {
      const match = document.cookie.match(/(?:^|; )kairo_device_id=([^;]*)/);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]).trim();
        if (decoded && decoded.length >= 12) {
          deviceId = decoded;
        }
      }
    } catch {}
  }

  // 4. Generate new token if none found
  if (!deviceId) {
    deviceId = generateClientDeviceToken();
  }

  // Ensure it is saved across all client storage mechanisms
  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    sessionStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    document.cookie = `${DEVICE_STORAGE_KEY}=${encodeURIComponent(deviceId)}; path=/; max-age=315360000; SameSite=Lax`;
  } catch {}

  return deviceId;
}
