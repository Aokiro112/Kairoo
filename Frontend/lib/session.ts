export interface UserSession {
  id?: string;
  name: string;
  email: string;
  picture?: string;
  provider?: string;
  role?: string;
  tier?: string;
}

export const saveUserSession = (user: UserSession): void => {
  if (typeof window === 'undefined') return;
  try {
    const json = JSON.stringify(user);
    localStorage.setItem('kairo_user', json);
    document.cookie = `kairo_user=${encodeURIComponent(json)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (e) {
    console.warn('Failed to save session', e);
  }
};

export const getUserSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const local = localStorage.getItem('kairo_user');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && (parsed.email || parsed.name)) {
        return parsed;
      }
    }

    const match = document.cookie.match(/(?:^|; )kairo_user=([^;]*)/);
    if (match && match[1]) {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      if (parsed && (parsed.email || parsed.name)) {
        localStorage.setItem('kairo_user', JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch {}
  return null;
};

export const clearUserSession = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('kairo_user');
    document.cookie = 'kairo_user=; path=/; max-age=0; SameSite=Lax';
  } catch {}
};
