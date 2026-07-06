import { QueryClient } from '@tanstack/react-query';
import { getCurrentUserId } from '@/lib/auth-storage';

export const ANONYMOUS_USER_KEY = 'anonymous';

export function getActiveUserQueryKeySegment() {
  return getCurrentUserId() ?? ANONYMOUS_USER_KEY;
}

/** Prefix React Query keys with the active user to prevent cross-account cache bleed. */
export function userScopedQueryKey(...parts) {
  return ['user', getActiveUserQueryKeySegment(), ...parts];
}

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function clearQueryCacheForUserSwitch(previousUserId) {
  if (previousUserId) {
    queryClientInstance.removeQueries({ queryKey: ['user', previousUserId] });
  }
  queryClientInstance.clear();
}

export function invalidateUserQueries(userId = getCurrentUserId()) {
  if (!userId) return;
  queryClientInstance.invalidateQueries({ queryKey: ['user', userId] });
}

if (typeof window !== 'undefined') {
  window.addEventListener('axiom-auth-change', () => {
    invalidateUserQueries();
  });
}
