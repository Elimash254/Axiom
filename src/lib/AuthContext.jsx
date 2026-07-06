import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Adjust this path to where your Supabase client is initialized
import { clearQueryCacheForUserSwitch } from '@/lib/query-client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  useEffect(() => {
    // Check if URL contains OAuth hash fragments (access_token, error, etc.)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasOAuthCallback = hashParams.has('access_token') || hashParams.has('error') || hashParams.has('error_description');
    
    if (hasOAuthCallback) {
      console.log('[AuthContext] Detected OAuth callback in URL hash');
      setIsProcessingOAuth(true);
    }

    // 1. Check active session on initial mount
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user);
      } catch (error) {
        console.error('Error fetching initial session:', error);
        setAuthError(error.message);
      } finally {
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    };

    initializeAuth();

    // 2. Listen for auth state changes (sign in, sign out, token refreshes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state change:', { event, hasSession: !!session, userId: session?.user?.id });
      const currentUser = session?.user ?? null;
      
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      
      // Clear OAuth processing flag when session is established
      if (event === 'SIGNED_IN' && currentUser) {
        setIsProcessingOAuth(false);
      }

      // Reset error state on successful state changes
      if (currentUser) setAuthError(null); 
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Google OAuth Login
  const loginWithGoogle = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      console.log('[AuthContext] Initiating Google OAuth with redirect to:', window.location.origin + '/');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/',
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('[AuthContext] Google login error:', error);
      setAuthError(error.message);
      setIsLoadingAuth(false);
    }
  };

  // Logout Function
  const logout = async () => {
    const previousUserId = user?.id;
    try {
      setIsLoadingAuth(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError(error.message);
    } finally {
      // Clear query caches and force redirect
      if (previousUserId) {
        clearQueryCacheForUserSwitch(previousUserId);
      }
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthError(null);
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  // Helper to manually update local user state if modifying metadata locally
  const updateUser = (patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  // Force refresh user data from Supabase
  const forceRefreshAuth = async () => {
    const { data: { user: freshUser } } = await supabase.auth.getUser();
    if (freshUser) setUser(freshUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user, // Exposed for standard bindings like user.id
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: null,
        authChecked,
        isProcessingOAuth,
        loginWithGoogle, // New function mapping
        logout,
        navigateToLogin,
        updateUser,
        // Legacy auth function fallbacks:
        checkUserAuth: forceRefreshAuth,
        checkAppState: forceRefreshAuth,
        refreshUser: forceRefreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};