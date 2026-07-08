import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import AlarmChecker from '@/components/AlarmChecker';
import SideDrawer from '@/components/SideDrawer';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationCenter from '@/components/NotificationCenter';
import { usePrivacyMode } from '@/lib/PrivacyModeContext';

const ROOT_ROUTES = ['/', '/habits', '/finance', '/learning'];

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isRootRoute = ROOT_ROUTES.includes(location.pathname);
  const { hideBalances, togglePrivacyMode } = usePrivacyMode();

  useEffect(() => {
    const savedTheme = localStorage.getItem('app_theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultTheme = savedTheme || (systemDark ? 'dark' : 'light');
    if (defaultTheme === 'light') {
      document.documentElement.classList.add('light');
    }
    const savedAccent = localStorage.getItem('app_accent');
    if (savedAccent) {
      document.documentElement.style.setProperty('--ring', savedAccent);
      document.documentElement.style.setProperty('--sidebar-ring', savedAccent);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground no-tap-highlight">
      {isRootRoute ? (
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] left-4 z-40 w-10 h-10 rounded-xl glass-strong flex items-center justify-center hover:bg-white/5 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" strokeWidth={2.5} />
        </button>
      ) : (
        <button
          onClick={() => navigate(-1)}
          className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] left-4 z-40 w-10 h-10 rounded-xl glass-strong flex items-center justify-center hover:bg-white/5 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
      )}
      <div className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] right-4 z-40 flex items-center gap-2">
        <NotificationCenter />
        <button
          onClick={togglePrivacyMode}
          className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center hover:bg-white/5 transition-colors"
          aria-label={hideBalances ? "Show balances" : "Hide balances"}
        >
          {hideBalances ? <EyeOff className="w-5 h-5" strokeWidth={2.5} /> : <Eye className="w-5 h-5" strokeWidth={2.5} />}
        </button>
        <ThemeToggle />
      </div>
      <main className="pb-24 max-w-2xl mx-auto min-h-screen overscroll-none">
        <Outlet />
      </main>
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <AlarmChecker />
      <BottomNav />
    </div>
  );
}