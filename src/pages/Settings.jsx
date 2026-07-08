import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Check, Download, Palette, Bell, Sun, Moon, Trash2, UserX, Database, RefreshCw } from 'lucide-react';
import { migrateToSupabase, checkMigrationStatus } from '@/lib/migrateToSupabase';

const ACCENTS = [
  { name: 'Copper', hsl: '21 48% 56%', preview: '#C47D57' },
  { name: 'Emerald', hsl: '150 60% 45%', preview: '#10B981' },
  { name: 'Sage', hsl: '143 14% 56%', preview: '#7E9D8A' },
];

export default function Settings() {
  const { logout } = useAuth();
  const [accent, setAccent] = useState('21 48% 56%');
  const [alarmsEnabled, setAlarmsEnabled] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [deleting, setDeleting] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);

  useEffect(() => {
    const savedAccent = localStorage.getItem('app_accent') || '21 48% 56%';
    const savedAlarms = localStorage.getItem('alarms_enabled') !== 'false';
    const savedTheme = localStorage.getItem('app_theme') || 'dark';
    setAccent(savedAccent);
    setAlarmsEnabled(savedAlarms);
    setTheme(savedTheme);

    // Check migration status
    checkMigrationStatus().then(result => {
      console.log('[Settings] Migration status:', result);
      setMigrationStatus(result);
    }).catch(err => {
      console.error('[Settings] Migration status check failed:', err);
      setMigrationStatus({ hasSupabaseData: false, hasLocalData: false, needsMigration: false, canClearLocal: false });
    });
  }, []);

  const applyTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const applyAccent = (hsl) => {
    setAccent(hsl);
    localStorage.setItem('app_accent', hsl);
    document.documentElement.style.setProperty('--ring', hsl);
    document.documentElement.style.setProperty('--sidebar-ring', hsl);
  };

  const toggleAlarms = (enabled) => {
    setAlarmsEnabled(enabled);
    localStorage.setItem('alarms_enabled', enabled.toString());
  };

  const handleClearAllData = async () => {
    setClearingData(true);
    try {
      const entities = [
        'Transaction', 'Account', 'HabitLog', 'Habit', 'Goal', 'Milestone',
        'Course', 'Topic', 'Book', 'Flashcard', 'Holding', 'SavingsGoal',
        'CalendarEvent', 'Alarm', 'WeeklyReview'
      ];
      for (const e of entities) {
        try {
          await base44.entities[e].deleteMany({});
        } catch (err) {
          console.error(`Failed to clear ${e}:`, err);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClearingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // Clear all local data first
      const entities = [
        'Transaction', 'Account', 'HabitLog', 'Habit', 'Goal', 'Milestone',
        'Course', 'Topic', 'Book', 'Flashcard', 'Holding', 'SavingsGoal',
        'CalendarEvent', 'Alarm', 'WeeklyReview'
      ];
      for (const e of entities) {
        try {
          await base44.entities[e].deleteMany({});
        } catch (err) {
          console.error(`Failed to clear ${e}:`, err);
        }
      }
      // Then logout
      await logout();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const result = await migrateToSupabase();
      console.log('Migration result:', result);
      // Refresh migration status
      const newStatus = await checkMigrationStatus();
      setMigrationStatus(newStatus);
      alert(`Migration complete!\n\nTotal: ${result.total}\nSuccess: ${result.success}\nFailed: ${result.failed}`);
    } catch (error) {
      console.error('Migration error:', error);
      alert('Migration failed. Please check the console for details.');
    } finally {
      setMigrating(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const [habits, habitLogs, goals, milestones, courses, books, accounts, transactions, holdings, savingsGoals, events, alarms] =
        await Promise.all([
          base44.entities.Habit.list(),
          base44.entities.HabitLog.list(),
          base44.entities.Goal.list(),
          base44.entities.Milestone.list(),
          base44.entities.Course.list(),
          base44.entities.Book.list(),
          base44.entities.Account.list(),
          base44.entities.Transaction.list(),
          base44.entities.Holding.list(),
          base44.entities.SavingsGoal.list(),
          base44.entities.CalendarEvent.list(),
          base44.entities.Alarm.list(),
        ]);
      const data = {
        exported_at: new Date().toISOString(),
        habits,
        habitLogs,
        goals,
        milestones,
        courses,
        books,
        accounts,
        transactions,
        holdings,
        savingsGoals,
        events,
        alarms,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifeos-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
    <div className="px-5 pt-12 pb-8">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Account</p>
        <h1 className="text-3xl font-heading font-bold mt-1">Settings</h1>
      </div>

      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Accent Theme
          </h2>
        </div>
        <div className="flex gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.name}
              onClick={() => applyAccent(a.hsl)}
              className={`relative w-12 h-12 rounded-full transition-transform no-tap-highlight ${
                accent === a.hsl ? 'ring-2 ring-offset-2 ring-offset-background' : ''
              }`}
              style={{ backgroundColor: a.preview, boxShadow: accent === a.hsl ? `0 0 16px ${a.preview}66` : 'none' }}
              aria-label={a.name}
            >
              {accent === a.hsl && (
                <Check className="w-5 h-5 text-white absolute inset-0 m-auto" strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">Personalizes focus rings and highlights across the app.</p>
      </div>

      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          {theme === 'dark' ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Theme
          </h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => applyTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-copper text-background' : 'glass text-muted-foreground'}`}
          >
            <Moon className="w-4 h-4" /> Dark
          </button>
          <button
            onClick={() => applyTheme('light')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors ${theme === 'light' ? 'bg-copper text-background' : 'glass text-muted-foreground'}`}
          >
            <Sun className="w-4 h-4" /> Light
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-medium">Alarm Notifications</h3>
              <p className="text-[10px] text-muted-foreground">Toggle background alarm checking</p>
            </div>
          </div>
          <Switch checked={alarmsEnabled} onCheckedChange={toggleAlarms} />
        </div>
      </div>

      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Data Export
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Download all your AXIOMFLOW data (habits, finance, goals, learning, calendar) as a JSON file.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl glass-strong font-semibold text-sm disabled:opacity-50 transition-colors hover:bg-white/5"
        >
          {exported ? (
            <>
              <Check className="w-4 h-4 text-sage" />
              Exported!
            </>
          ) : exporting ? (
            'Exporting...'
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export My Data
            </>
          )}
        </button>
      </div>

      {/* Data Migration Section */}
      <div className="glass rounded-2xl p-5 mt-4 border border-copper/20">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-copper" />
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wide text-copper">
            Cloud Sync
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {migrationStatus ? (
            migrationStatus.needsMigration 
              ? 'You have local data that can be migrated to Supabase for multi-device sync and real-time updates.'
              : migrationStatus.hasSupabaseData
              ? 'Your data is synced with Supabase for multi-device access.'
              : 'No data found to migrate.'
          ) : 'Checking sync status...'}
        </p>
        {migrationStatus?.needsMigration && (
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-copper hover:bg-copper/90 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
          >
            {migrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Migrate to Cloud
              </>
            )}
          </button>
        )}
        {migrationStatus?.canClearLocal && (
          <button
            onClick={() => {
              if (confirm('Clear local data? Your cloud data will remain intact.')) {
                const userId = localStorage.getItem('user_id');
                if (userId) {
                  localStorage.removeItem(`axiom_user_data_${userId}`);
                  setMigrationStatus({ ...migrationStatus, hasLocalData: false });
                }
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl glass-strong font-semibold text-sm mt-2 transition-colors hover:bg-white/5"
          >
            <Trash2 className="w-4 h-4" />
            Clear Local Cache
          </button>
        )}
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-8">AXIOMFLOW v1.0 — Your personal operating system</p>

      <div className="glass rounded-2xl p-5 mt-8 border border-rose-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="w-4 h-4 text-rose-500" />
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wide text-rose-400">
            Clear Data
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Permanently delete all your data including habits, finance records, goals, and learning progress. Your account remains active.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={clearingData}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {clearingData ? 'Clearing...' : 'Clear All Data'}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all your data including habits, finance records, goals, and learning progress. Your account will remain active. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2">
              <AlertDialogCancel className="glass">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAllData}
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                Clear Everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="glass rounded-2xl p-5 mt-4 border border-red-900/20">
        <div className="flex items-center gap-2 mb-4">
          <UserX className="w-4 h-4 text-red-900" />
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wide text-red-700">
            Delete Account
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Permanently delete your account and all data. You will be logged out and will need to create a new account to use AXIOMFLOW again.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-900 hover:bg-red-950 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
            >
              <UserX className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and all your data, then log you out. You will need to create a new account to use AXIOMFLOW again. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2">
              <AlertDialogCancel className="glass">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-red-900 hover:bg-red-950 text-white"
              >
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
    </motion.div>
  );
}