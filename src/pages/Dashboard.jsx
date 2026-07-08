import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Flame, TrendingUp, TrendingDown, Target, BookOpen, Calendar as CalIcon, Wallet, Trophy } from 'lucide-react';
import ProgressRing from '@/components/ProgressRing';
import ProgressBar from '@/components/ProgressBar';
import PullToRefresh from '@/components/PullToRefresh';
import { useFormatCurrency } from '@/lib/useFormatCurrency';
import { formatPercent, todayStr, getGreeting, convertCurrency } from '@/lib/format';
import { useAuth } from '@/lib/AuthContext';
import CurrencyToggle from '@/components/finance/CurrencyToggle';
import { fetchUsdKesRate, fetchCryptoPrices, fetchAssetPrice } from '@/lib/priceService';

export default function Dashboard() {
  const { user } = useAuth();
  const { formatCurrency } = useFormatCurrency();
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [goals, setGoals] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [courses, setCourses] = useState([]);
  const [books, setBooks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [events, setEvents] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [review, setReview] = useState(null);
  const [displayCurrency, setDisplayCurrency] = useState('KES');
  const [exchangeRate, setExchangeRate] = useState(() => parseFloat(localStorage.getItem('usd_kes_rate')) || 130);

  // Read user metadata from Supabase
  const userMetadata = user?.user_metadata || {};
  const avatarUrl = userMetadata.avatar_url || '';
  const displayName = userMetadata.display_name || userMetadata.full_name || user?.email?.split('@')[0] || '';

  useEffect(() => {
    (async () => {
      try {
        const today = todayStr();
        const [h, hl, g, m, c, b, a, t, ho, e, sg] = await Promise.all([
          supabase.from('habits').select('*').eq('user_id', user.id).eq('active', true),
          supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', today),
          supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'in_progress'),
          supabase.from('milestones').select('*').eq('user_id', user.id),
          supabase.from('courses').select('*').eq('user_id', user.id).eq('status', 'active'),
          supabase.from('books').select('*').eq('user_id', user.id).eq('status', 'reading'),
          supabase.from('accounts').select('*').eq('user_id', user.id),
          supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
          supabase.from('holdings').select('*').eq('user_id', user.id),
          supabase.from('calendar_events').select('*').eq('user_id', user.id).eq('date', today),
          supabase.from('savings_goals').select('*').eq('user_id', user.id).eq('status', 'active')
        ]);

        setHabits(h.data || []);
        setHabitLogs(hl.data || []);
        setGoals(g.data || []);
        setMilestones(m.data || []);
        setCourses(c.data || []);
        setBooks(b.data || []);
        setAccounts(a.data || []);
        setTransactions(t.data || []);
        setHoldings(ho.data || []);
        setEvents(e.data || []);
        setSavingsGoals(sg.data || []);

        // Fetch latest reviews
        try {
          const { data: reviews } = await supabase.from('weekly_reviews').select('*').eq('user_id', user.id).order('week_starting', { ascending: false }).limit(1);
          setReview(reviews?.[0] || null);
        } catch {}

        // Fetch live prices for holdings
        if (ho.data && ho.data.length > 0) {
          fetchLivePrices(ho.data);
        }
        // Fetch exchange rate
        const rate = await fetchUsdKesRate();
        if (rate > 1) setExchangeRate(rate);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();

    // Set up Supabase real-time subscriptions for financial data
    const channels = [
      supabase.channel('accounts-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${user.id}` }, () => {
          supabase.from('accounts').select('*').eq('user_id', user.id).then(({ data }) => setAccounts(data || []));
        })
        .subscribe(),
      supabase.channel('transactions-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => {
          const today = todayStr();
          supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50).then(({ data }) => setTransactions(data || []));
        })
        .subscribe(),
      supabase.channel('holdings-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'holdings', filter: `user_id=eq.${user.id}` }, () => {
          supabase.from('holdings').select('*').eq('user_id', user.id).then(({ data }) => {
            setHoldings(data || []);
            if (data && data.length > 0) fetchLivePrices(data);
          });
        })
        .subscribe(),
      supabase.channel('savings_goals-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals', filter: `user_id=eq.${user.id}` }, () => {
          supabase.from('savings_goals').select('*').eq('user_id', user.id).then(({ data }) => setSavingsGoals(data || []));
        })
        .subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user.id]);

  const fetchLivePrices = async (holdingsData) => {
    const cryptoSyms = holdingsData.filter((h) => h.asset_type === 'crypto').map((h) => h.symbol);
    const cryptoData = cryptoSyms.length > 0 ? await fetchCryptoPrices(cryptoSyms) : {};

    const updated = [...holdingsData];
    for (let h of updated) {
      try {
        let price, logo;
        if (h.asset_type === 'crypto' && cryptoData[h.symbol]) {
          price = cryptoData[h.symbol].price;
          logo = cryptoData[h.symbol].logo;
        } else {
          const result = await fetchAssetPrice(h);
          price = result.price;
          logo = result.logo;
        }
        if (price) {
          h.current_price = price;
          h.last_updated = new Date().toISOString();
          if (logo) h.logo_url = logo;
          try {await supabase.from('holdings').update({ current_price: h.current_price, last_updated: h.last_updated, logo_url: h.logo_url }).eq('id', h.id).eq('user_id', user.id);} catch {}
        }
      } catch {}
    }
    setHoldings([...updated]);
  };

  // Auto-refresh prices every 60 seconds
  useEffect(() => {
    if (holdings.length === 0) return;
    const interval = setInterval(() => fetchLivePrices(holdings), 60000);
    return () => clearInterval(interval);
  }, [holdings.length]);

  // Calculate values
  const today = new Date().toISOString().split('T')[0];
  const completedToday = habitLogs.filter((l) => l.date === today && l.status === 'completed').length;
  const habitPct = habits.length > 0 ? completedToday / habits.length * 100 : 0;

  const cashTotalRaw = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const cashTotal = convertCurrency(cashTotalRaw, 'KES', displayCurrency, exchangeRate);
  const savingsTotalRaw = savingsGoals.reduce((sum, s) => sum + (Number(s.current_amount) || 0), 0);
  const savingsTotal = convertCurrency(savingsTotalRaw, 'KES', displayCurrency, exchangeRate);
  const portfolioValue = holdings.reduce((sum, h) => {
    const hc = h.currency || 'USD';
    const quantity = Number(h.quantity) || 0;
    const currentPrice = Number(h.current_price) || Number(h.buy_price) || 0;
    const raw = quantity * currentPrice;
    return sum + convertCurrency(raw, hc, displayCurrency, exchangeRate);
  }, 0);
  const portfolioCost = holdings.reduce((sum, h) => {
    const hc = h.currency || 'USD';
    const quantity = Number(h.quantity) || 0;
    const buyPrice = Number(h.buy_price) || 0;
    const raw = quantity * buyPrice;
    return sum + convertCurrency(raw, hc, displayCurrency, exchangeRate);
  }, 0);
  const portfolioChange = portfolioCost > 0 ? (portfolioValue - portfolioCost) / portfolioCost * 100 : 0;
  const netWorth = cashTotal + savingsTotal + portfolioValue;

  const todayTxns = transactions.filter((t) => t.date === today);
  const todayIncome = todayTxns.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const todayExpense = todayTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const todayCashFlow = convertCurrency(todayIncome - todayExpense, 'KES', displayCurrency, exchangeRate);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
      </div>);

  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
    <PullToRefresh onRefresh={async () => {
      const today = todayStr();
      const [h, hl, g, m, c, b, a, t, ho, e, sg] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', user.id).eq('active', true),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', today),
        supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'in_progress'),
        supabase.from('milestones').select('*').eq('user_id', user.id),
        supabase.from('courses').select('*').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('books').select('*').eq('user_id', user.id).eq('status', 'reading'),
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
        supabase.from('holdings').select('*').eq('user_id', user.id),
        supabase.from('calendar_events').select('*').eq('user_id', user.id).eq('date', today),
        supabase.from('savings_goals').select('*').eq('user_id', user.id).eq('status', 'active'),
      ]);
      setHabits(h.data || []); setHabitLogs(hl.data || []); setGoals(g.data || []); setMilestones(m.data || []);
      setCourses(c.data || []); setBooks(b.data || []); setAccounts(a.data || []); setTransactions(t.data || []);
      setHoldings(ho.data || []); setEvents(e.data || []); setSavingsGoals(sg.data || []);
      const rate = await fetchUsdKesRate();
      if (rate > 1) setExchangeRate(rate);
      if (ho.data && ho.data.length > 0) fetchLivePrices(ho.data);
    }}>
    <div className="px-5 pt-12 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="text-3xl font-bold mt-1">
            {getGreeting()}{displayName ? `, ${displayName.split(' ')[0]}` : ''}.
          </h1>
        </div>
        <Link to="/profile" className="shrink-0 mt-1 no-tap-highlight">
          {avatarUrl ?
          <img src={avatarUrl} alt="Profile" className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10" /> :

          <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center ring-2 ring-white/10">
              <span className="text-base font-bold">{displayName.charAt(0).toUpperCase()}</span>
            </div>
          }
        </Link>
      </div>

      {/* Habits Ring - Hero Section */}
      <Link to="/habits" className="block mb-6">
        <div className={`glass-strong rounded-3xl p-6 flex items-center gap-4 transition-all ${habitPct === 100 ? 'ring-2 ring-copper/50 bg-copper/5' : ''} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-sage/5 rounded-full blur-3xl"></div>
          <ProgressRing progress={habitPct} color={habitPct === 100 ? '#C47D57' : '#7E9D8A'} size={80}>
            <div className="text-center">
              <span className="text-xl font-bold">{completedToday}</span>
              <span className="text-xs text-muted-foreground">/{habits.length}</span>
            </div>
          </ProgressRing>
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 mb-1">
              <Flame className={`w-5 h-5 ${habitPct === 100 ? 'text-copper' : 'text-sage'}`} />
              <h3 className="text-lg font-semibold">Today's Habits</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {habits.length === 0 ? 'Set up your first habit' :
              habitPct === 100 ? 'All done for today! 🔥' :
              `${habits.length - completedToday} remaining`}
            </p>
          </div>
          <div className="text-right relative">
            <p className="text-3xl">{habitPct === 100 ? '🏆' : '🔥'}</p>
          </div>
        </div>
      </Link>

      {/* Learning Progress - Hero Section */}
      {(courses.length > 0 || books.length > 0) &&
      <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Learning Progress</h2>
            <Link to="/learning" className="text-xs text-sage">View all</Link>
          </div>
          <div className="space-y-2">
            {courses.slice(0, 2).map((course) => {
            const pct = course.total_lessons > 0 ? course.lessons_completed / course.total_lessons * 100 : 0;
            return (
              <Link key={course.id} to="/learning" className="block glass rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate">{course.title}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                  </div>
                  <ProgressBar value={course.lessons_completed} max={course.total_lessons} color={course.color || '#8b5cf6'} height={5} />
                </Link>);

          })}
            {books.slice(0, 1).map((book) => {
            const pct = book.total_pages > 0 ? book.pages_read / book.total_pages * 100 : 0;
            return (
              <Link key={book.id} to="/learning" className="block glass rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate">📖 {book.title}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                  </div>
                  <ProgressBar value={book.pages_read} max={book.total_pages} color={book.color || '#8b5cf6'} height={5} />
                </Link>);

          })}
          </div>
        </div>
      }

      {/* Top Goals */}
      {goals.length > 0 &&
      <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Active Goals</h2>
            <Link to="/goals" className="text-xs text-copper">View all</Link>
          </div>
          <div className="space-y-2">
            {goals.slice(0, 3).map((goal) => {
            const goalMilestones = milestones.filter((m) => m.goal_id === goal.id);
            const completed = goalMilestones.filter((m) => m.completed).length;
            const total = goalMilestones.length || goal.milestones_total || 1;
            const pct = completed / total * 100;
            return (
              <Link key={goal.id} to="/goals" className="block glass rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate">{goal.title}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                  </div>
                  <ProgressBar value={completed} max={total} color={goal.color || '#3b82f6'} height={5} />
                </Link>);

          })}
          </div>
        </div>
      }

      {/* Finance At a Glance - Compact */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">At a Glance</h2>
          <CurrencyToggle currency={displayCurrency} onToggle={setDisplayCurrency} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-muted-foreground uppercase mb-1">Net Worth</p>
            <p className="text-lg font-bold">{formatCurrency(netWorth, true, displayCurrency)}</p>
          </div>
          <Link to="/finance" className="block glass rounded-xl p-3">
            <p className="text-xs text-muted-foreground uppercase mb-1">Today's Flow</p>
            <p className={`text-lg font-bold ${todayCashFlow >= 0 ? 'text-sage' : 'text-rose-400'}`}>
              {formatCurrency(todayCashFlow, true, displayCurrency)}
            </p>
          </Link>
        </div>
      </div>

      {/* Today's Events */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Today's Schedule</h2>
          <Link to="/calendar" className="text-xs text-rose-400">Calendar</Link>
        </div>
        {events.length > 0 ?
        <div className="space-y-2">
            {events.sort((a, b) => (a.time || '').localeCompare(b.time || '')).map((ev) =>
          <div key={ev.id} className="glass rounded-xl p-3 flex items-center gap-3">
                <div className="w-1 h-8 rounded-full" style={{ backgroundColor: ev.color || '#f43f5e' }}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{ev.title}</p>
                  {ev.time && <p className="text-xs text-muted-foreground">{ev.time}</p>}
                </div>
              </div>
          )}
          </div> :

        <div className="glass rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">Nothing scheduled for today</p>
          </div>
        }
      </div>

      {/* Weekly Review Badge */}
      <Link to="/calendar" className="block">
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-copper/15 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-copper" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Weekly Review</p>
            <p className="text-xs text-muted-foreground">
              {review ? `Last reviewed: ${review.week_starting}` : 'Not done this week — take 5 min to reflect'}
            </p>
          </div>
        </div>
      </Link>
      </div>
      </PullToRefresh>
      </motion.div>
      );
      }