import { supabase } from '@/lib/supabaseClient';

const LEGACY_TOKEN_KEYS = ['base44_access_token', 'token', 'base44_app_id', 'base44_access_token'];

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export function getCurrentUserId() {
  // Try multiple ways to get the user ID
  try {
    // Method 1: Try Supabase session
    const sessionKeys = Object.keys(localStorage).filter(key => key.includes('sb-') && key.includes('auth'));
    for (const key of sessionKeys) {
      try {
        const session = JSON.parse(localStorage.getItem(key));
        if (session?.user?.id) return session.user.id;
      } catch {}
    }
    
    // Method 2: Try direct user_id key (legacy)
    const directUserId = localStorage.getItem('user_id');
    if (directUserId) return directUserId;
    
    return null;
  } catch {
    return null;
  }
}

export function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('axiom-auth-change'));
  }
}

function clearLegacyTokens() {
  for (const key of LEGACY_TOKEN_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors in restricted environments.
    }
  }
}

export const authStorage = {
  getSession,
  getCurrentUserId,
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) {
      const authError = new Error('Not authenticated');
      authError.status = 401;
      throw authError;
    }
    return user;
  },
  setToken(token) {
    // Supabase manages tokens automatically via session
    // This is a no-op for compatibility
  },
  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) throw error;
    return data;
  },
  async resendOtp(email) {
    const { data, error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
    return data;
  },
  loginWithProvider(provider, redirectPath = '/') {
    // This is handled by AuthContext.loginWithGoogle
    // Kept for compatibility but should not be called directly
    console.warn('loginWithProvider called directly - use AuthContext.loginWithGoogle instead');
  },
  async updateMe(patch) {
    const { data, error } = await supabase.auth.updateUser({ data: patch });
    if (error) throw error;
    notifyAuthChange();
    return data.user;
  },
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    clearLegacyTokens();
  },
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return {};
  },
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return {};
  },
};
