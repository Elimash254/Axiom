import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageNotFound from '@/lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PrivacyModeProvider } from '@/lib/PrivacyModeContext';
import { AppProvider } from '@/lib/AppContext';
import { DataProvider } from '@/lib/DataContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from '@/components/ScorllToTop';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Habits from '@/pages/Habits';
import Finance from '@/pages/Finance';
import Goals from '@/pages/Goals';
import Learning from '@/pages/Learning';
import Calendar from '@/pages/Calendar';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

const LoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
  </div>
);

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, user, isProcessingOAuth } = useAuth();
  const location = useLocation();

  console.log('[AuthenticatedApp] State:', { isLoadingAuth, isLoadingPublicSettings, isAuthenticated, isProcessingOAuth, userId: user?.id, pathname: location.pathname });

  // Show loading while auth is loading OR while processing OAuth callback
  if (isLoadingPublicSettings || isLoadingAuth || isProcessingOAuth) {
    console.log('[AuthenticatedApp] Showing loading fallback (isProcessingOAuth:', isProcessingOAuth, ')');
    return <LoadingFallback />;
  }

  if (authError) {
    console.log('[AuthenticatedApp] Auth error:', authError);
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <Navigate to="/login" replace />;
    }
  }

  const isAuthPage = AUTH_PAGES.includes(location.pathname);

  // Gate: unauthenticated users can only access auth pages
  if (!isAuthenticated && !isAuthPage) {
    console.log('[AuthenticatedApp] Redirecting to login - not authenticated');
    return <Navigate to="/login" replace />;
  }

  // Already logged in? Don't show auth pages
  if (isAuthenticated && isAuthPage) {
    console.log('[AuthenticatedApp] Redirecting to home - already authenticated');
    return <Navigate to="/" replace />;
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/learning" element={<Learning />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <PrivacyModeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <AppProvider>
            <DataProvider>
              <Router>
                <ScrollToTop />
                <AuthenticatedApp />
              </Router>
              <Toaster />
            </DataProvider>
          </AppProvider>
        </QueryClientProvider>
      </PrivacyModeProvider>
    </AuthProvider>
  )
}

export default App