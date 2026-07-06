import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Repeat, Wallet, BookOpen } from 'lucide-react';

const navItems = [
{ to: '/', label: 'Home', icon: LayoutDashboard },
{ to: '/habits', label: 'Habits', icon: Repeat },
{ to: '/finance', label: 'Finance', icon: Wallet },
{ to: '/learning', label: 'Learn', icon: BookOpen }];


export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (e, item) => {
    if (location.pathname === item.to) {
      e.preventDefault();
      navigate(item.to, { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-2xl mx-auto px-3 pb-3 safe-area-bottom">
        <div className="glass-strong rounded-2xl flex items-center justify-around px-1 py-2 shadow-2xl">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={(e) => handleNavClick(e, item)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 no-tap-highlight select-none ${
                isActive ? "" : 'text-muted-foreground hover:text-foreground'}`
                }>
                
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[11px] font-medium ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.label}
                </span>
              </Link>);

          })}
        </div>
      </div>
    </nav>);

}