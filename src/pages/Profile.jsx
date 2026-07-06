import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Camera, Save, Flame, Target, BookOpen, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export default function Profile() {
  const { user, checkUserAuth, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [readingSpeed, setReadingSpeed] = useState('1.5');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Supabase stores custom metadata in user.user_metadata
    const metadata = user?.user_metadata || {};
    setDisplayName(metadata.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '');
    setBio(metadata.bio || '');
    setAvatarUrl(metadata.avatar_url || '');
    setReadingSpeed(String(metadata.reading_speed || 1.5));
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const [habits, goals, courses, books, accounts, habitLogs] = await Promise.all([
          base44.entities.Habit.list(),
          base44.entities.Goal.list(),
          base44.entities.Course.list(),
          base44.entities.Book.list(),
          base44.entities.Account.list(),
          base44.entities.HabitLog.list(),
        ]);
        setStats({ habits, goals, courses, books, accounts, habitLogs });
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStats(false);
      }
    })();
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ avatar_url: file_url });
      setAvatarUrl(file_url);
      updateUser({ user_metadata: { ...user?.user_metadata, avatar_url: file_url } });
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ display_name: displayName, bio, reading_speed: parseFloat(readingSpeed) || 1.5 });
      updateUser({ user_metadata: { ...user?.user_metadata, display_name: displayName, bio, reading_speed: parseFloat(readingSpeed) || 1.5 } });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const netWorth = stats ? stats.accounts.reduce((s, a) => s + (a.balance || 0), 0) : 0;
  const goalsAchieved = stats ? stats.goals.filter((g) => g.status === 'achieved').length : 0;
  const habitsCompleted = stats ? stats.habitLogs.filter((l) => l.status === 'completed').length : 0;
  const initial = (displayName || user?.full_name || 'U').charAt(0).toUpperCase();

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
        <h1 className="text-3xl font-heading font-bold mt-1">Profile</h1>
      </div>

      <div className="flex flex-col items-center mb-8">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative w-28 h-28 rounded-full overflow-hidden glass-strong group no-tap-highlight"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-4xl font-heading font-bold text-white/80">{initial}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera className="w-6 h-6 text-white" />
          </div>
          {uploadingAvatar && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="w-6 h-6 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        <p className="text-xs text-muted-foreground mt-3">
          {uploadingAvatar ? 'Uploading...' : 'Tap to change photo'}
        </p>
      </div>

      <div className="glass rounded-2xl p-5 mb-6 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase font-medium">Display Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full bg-transparent border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Your name"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Shown in your dashboard greeting.</p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-medium">Bio / Life Motto</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="mt-1 w-full bg-transparent border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="What drives you?"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-medium">Reading Speed (min/page)</label>
          <input
            type="number"
            step="0.1"
            value={readingSpeed}
            onChange={(e) => setReadingSpeed(e.target.value)}
            className="mt-1 w-full bg-transparent border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="1.5"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Used to estimate time to finish your books. Default: 1.5 min/page.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="mb-6">
        <h2 className="font-heading font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
          AXIOMFLOW Summary
        </h2>
        {loadingStats ? (
          <div className="glass rounded-2xl p-8 flex justify-center">
            <div className="w-6 h-6 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatTile icon={Flame} label="Habits Done" value={habitsCompleted} color="#7E9D8A" />
            <StatTile icon={Target} label="Goals Achieved" value={goalsAchieved} color="#C47D57" />
            <StatTile
              icon={BookOpen}
              label="Books & Courses"
              value={(stats?.books.length || 0) + (stats?.courses.length || 0)}
              color="#7E9D8A"
            />
            <StatTile icon={Wallet} label="Net Worth" value={formatCurrency(netWorth, true)} color="#C47D57" />
          </div>
        )}
      </div>

      <Link to="/settings" className="block glass rounded-2xl p-4 flex items-center justify-between">
        <span className="text-sm font-medium">Account Settings</span>
        <span className="text-muted-foreground">→</span>
      </Link>
    </div>
    </motion.div>
  );
}

function StatTile({ icon: Icon, label, value, color }) {
  return (
    <div className="glass rounded-2xl p-4">
      <Icon className="w-4 h-4 mb-2" style={{ color }} />
      <p className="text-xl font-heading font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}