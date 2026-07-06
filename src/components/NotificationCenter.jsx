import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Bell, Flame, Calendar, BookOpen, Target, X } from 'lucide-react';
import { todayStr } from '@/lib/format';

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_notifs') || '{}'); }
    catch { return {}; }
  });

  const dismissKey = (n) => `${n.type}-${n.id}`;
  const isDismissed = (n) => dismissed[dismissKey(n)] === todayStr();

  const dismiss = (n) => {
    const next = { ...dismissed, [dismissKey(n)]: todayStr() };
    setDismissed(next);
    localStorage.setItem('dismissed_notifs', JSON.stringify(next));
  };

  const dismissAll = () => {
    const next = {};
    notifications.forEach(n => { next[dismissKey(n)] = todayStr(); });
    setDismissed(next);
    localStorage.setItem('dismissed_notifs', JSON.stringify(next));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const today = todayStr();
        const [habits, habitLogs, events, topics, goals] = await Promise.all([
          base44.entities.Habit.filter({ active: true }),
          base44.entities.HabitLog.filter({ date: today }),
          base44.entities.CalendarEvent.filter({ date: today }),
          base44.entities.Topic.list(),
          base44.entities.Goal.filter({ status: 'in_progress' }),
        ]);

        const notifs = [];

        const doneIds = habitLogs.filter(l => l.status === 'completed').map(l => l.habit_id);
        const incomplete = habits.filter(h => !doneIds.includes(h.id));
        if (incomplete.length > 0) {
          notifs.push({
            type: 'habit', id: 'incomplete',
            title: `${incomplete.length} habit${incomplete.length > 1 ? 's' : ''} remaining`,
            subtitle: 'Tap to complete your daily habits',
            icon: 'flame', link: '/habits', color: '#C47D57',
          });
        }

        const now = new Date();
        const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const upcoming = events.filter(e => !e.time || e.time >= curTime).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        if (upcoming.length > 0) {
          const next = upcoming[0];
          notifs.push({
            type: 'event', id: next.id,
            title: next.title,
            subtitle: next.time ? `Today at ${next.time}` : 'Today',
            icon: 'calendar', link: '/calendar', color: '#f43f5e',
          });
        }

        const todayTopics = topics.filter(t => t.scheduled_date === today && !t.completed);
        if (todayTopics.length > 0) {
          notifs.push({
            type: 'learning', id: todayTopics[0].id,
            title: `Study: ${todayTopics[0].title}`,
            subtitle: todayTopics[0].scheduled_time ? `Scheduled at ${todayTopics[0].scheduled_time}` : 'Scheduled for today',
            icon: 'book', link: '/learning', color: '#7E9D8A',
          });
        }

        const soon = new Date();
        soon.setDate(soon.getDate() + 7);
        const approaching = goals.filter(g => g.target_date && new Date(g.target_date) <= soon);
        if (approaching.length > 0) {
          const g = approaching[0];
          const days = Math.ceil((new Date(g.target_date) - new Date()) / 86400000);
          notifs.push({
            type: 'goal', id: g.id,
            title: g.title,
            subtitle: days >= 0 ? `${days} day${days !== 1 ? 's' : ''} until target` : 'Target date passed',
            icon: 'target', link: '/goals', color: '#C47D57',
          });
        }

        setNotifications(notifs);
      } catch (e) { /* silent */ }
    };

    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const active = notifications.filter(n => !isDismissed(n));
  const count = active.length;
  const iconMap = { flame: Flame, calendar: Calendar, book: BookOpen, target: Target };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-xl glass-strong flex items-center justify-center hover:bg-white/5 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" strokeWidth={2.5} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-copper text-[10px] font-bold flex items-center justify-center text-background">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-12 right-0 w-80 max-w-[calc(100vw-2rem)] glass-strong rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-white/5">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {count > 0 && (
                <button onClick={dismissAll} className="text-xs text-muted-foreground hover:text-foreground">Clear all</button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {active.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">You're all caught up!</p>
                </div>
              ) : (
                active.map(n => {
                  const Icon = iconMap[n.icon] || Bell;
                  return (
                    <div key={`${n.type}-${n.id}`} className="flex items-start gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                      <Link to={n.link} onClick={() => setOpen(false)} className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${n.color}20` }}>
                          <Icon className="w-4 h-4" style={{ color: n.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{n.subtitle}</p>
                        </div>
                      </Link>
                      <button onClick={() => dismiss(n)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}