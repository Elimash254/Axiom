const STORAGE_PREFIX = 'axiom_app_';

export const appParams = {
  appName: import.meta.env.VITE_APP_NAME || 'AXIOMFLOW',
};

export function getAppStorageKey(suffix) {
  return `${STORAGE_PREFIX}${suffix}`;
}

export function getUserScopedStorageKey(userId, suffix) {
  if (!userId) return getAppStorageKey(suffix);
  return `${STORAGE_PREFIX}user_${userId}_${suffix}`;
}
