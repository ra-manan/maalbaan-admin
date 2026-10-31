/** Which Maalbaan server the panel talks to: the live one, or the staging one used to try changes and demo accounts. */

export type Environment = 'live' | 'staging';

export const API_URLS: Record<Environment, string> = {
  live: 'https://api.maalbaan.com',
  staging: 'https://api-staging.maalbaan.com',
};

const KEY = 'maalbaan-admin:environment';

/** Staging only when it was chosen on this browser; anything else (or no storage) is live. */
export function readEnvironment(storage: Pick<Storage, 'getItem'> | null): Environment {
  try {
    return storage?.getItem(KEY) === 'staging' ? 'staging' : 'live';
  } catch {
    return 'live';
  }
}

/** The address of the API. In development the proxy in vite.config.ts is used, so there is no staging choice there. */
export function apiBaseFor(environment: Environment, viteApiUrl: string | undefined, production: boolean): string {
  if (!production) return viteApiUrl ?? '';
  return viteApiUrl ?? API_URLS[environment];
}

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export const environment: Environment = readEnvironment(browserStorage());

/** Whether the Live / Staging switch makes sense: a deployed panel with no fixed server. */
export const canSwitchEnvironment: boolean = import.meta.env.PROD && !import.meta.env.VITE_API_URL;

/** The cookie that signs staff in belongs to one server, so after a switch the page reloads and asks the new server who is signed in. */
export function chooseEnvironment(next: Environment): void {
  try {
    if (next === 'staging') localStorage.setItem(KEY, 'staging');
    else localStorage.removeItem(KEY);
  } catch {
    return;
  }
  window.location.assign('/');
}
