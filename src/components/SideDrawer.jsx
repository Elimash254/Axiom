import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, User, Settings, Target, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const drawerItems = [
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/calendar', label: 'Agenda', icon: Calendar },
  { to: '/settings', label: 'Account Settings', icon: Settings },
];

export default function SideDrawer({ open, onClose }) {
  const { logout } = useAuth();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-card border-r border-white/8 flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <h2 className="text-lg font-heading font-bold text-white">Menu</h2>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground/90 hover:bg-muted transition-colors"
                  >
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-white/8 pb-24">
              <button
                onClick={() => logout()}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}