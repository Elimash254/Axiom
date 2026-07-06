import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('app_theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultTheme = saved || (systemDark ? 'dark' : 'light');
    setTheme(defaultTheme);
    if (defaultTheme === 'light') document.documentElement.classList.add('light');

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('app_theme')) {
        const t = e.matches ? 'dark' : 'light';
        setTheme(t);
        if (t === 'light') document.documentElement.classList.add('light');
        else document.documentElement.classList.remove('light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  return (
    <button
      onClick={toggle}
      className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center hover:bg-white/5 transition-colors no-tap-highlight"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" strokeWidth={2.5} /> : <Moon className="w-5 h-5" strokeWidth={2.5} />}
    </button>
  );
}