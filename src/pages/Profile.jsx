import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useFormatCurrency } from '@/lib/useFormatCurrency';
import { Camera, Save, Flame, Target, BookOpen, Wallet, X, Check } from 'lucide-react';
import { formatCurrency, convertCurrency } from '@/lib/format';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropImage';

export default function Profile() {
  const { user, checkUserAuth, updateUser } = useAuth();
  const { formatCurrency: formatCurrencyPrivate } = useFormatCurrency();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
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
        const [habits, goals, courses, books, accounts, habitLogs, holdings, savingsGoals] = await Promise.all([
          supabase.from('habits').select('*').eq('user_id', user.id),
          supabase.from('goals').select('*').eq('user_id', user.id),
          supabase.from('courses').select('*').eq('user_id', user.id),
          supabase.from('books').select('*').eq('user_id', user.id),
          supabase.from('accounts').select('*').eq('user_id', user.id),
          supabase.from('habit_logs').select('*').eq('user_id', user.id),
          supabase.from('holdings').select('*').eq('user_id', user.id),
          supabase.from('savings_goals').select('*').eq('user_id', user.id),
        ]);
        setStats({ habits: habits.data || [], goals: goals.data || [], courses: courses.data || [], books: books.data || [], accounts: accounts.data || [], habitLogs: habitLogs.data || [], holdings: holdings.data || [], savingsGoals: savingsGoals.data || [] });
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStats(false);
      }
    })();
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropAndUpload = async () => {
    if (!croppedAreaPixels || !imageToCrop) return;
    setUploadingAvatar(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const fileName = `avatar-${user.id}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedImageBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });
      setAvatarUrl(publicUrl);
      updateUser({ user_metadata: { ...user?.user_metadata, avatar_url: publicUrl } });
      setShowCropper(false);
      setImageToCrop(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (err) {
      console.error('Error uploading avatar:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCancelCrop = () => {
    setShowCropper(false);
    setImageToCrop(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.auth.updateUser({
        data: { display_name: displayName, bio, reading_speed: parseFloat(readingSpeed) || 1.5 }
      });
      updateUser({ user_metadata: { ...user?.user_metadata, display_name: displayName, bio, reading_speed: parseFloat(readingSpeed) || 1.5 } });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const exchangeRate = parseFloat(localStorage.getItem('usd_kes_rate')) || 130;
  const displayCurrency = 'KES';
  
  const cashTotalRaw = stats ? stats.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0) : 0;
  const cashTotal = convertCurrency(cashTotalRaw, 'KES', displayCurrency, exchangeRate);
  
  const portfolioValue = stats?.holdings ? stats.holdings.reduce((s, h) => {
    const hc = h?.currency || 'USD';
    const quantity = Number(h?.quantity) || 0;
    const currentPrice = Number(h?.current_price) || Number(h?.buy_price) || 0;
    const raw = quantity * currentPrice;
    return s + convertCurrency(raw, hc, displayCurrency, exchangeRate);
  }, 0) : 0;
  
  const savingsTotalRaw = stats?.savingsGoals ? stats.savingsGoals.reduce((s, g) => s + (Number(g?.current_amount) || 0), 0) : 0;
  const savingsTotal = convertCurrency(savingsTotalRaw, 'KES', displayCurrency, exchangeRate);
  
  const netWorth = cashTotal + portfolioValue + savingsTotal;
  const goalsAchieved = stats ? stats.goals.filter((g) => g.status === 'achieved').length : 0;
  const habitsCompleted = stats ? stats.habitLogs.filter((l) => l.status === 'completed').length : 0;
  const initial = (displayName || user?.full_name || 'U').charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
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

      {showCropper && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="relative w-full h-80 bg-black rounded-lg overflow-hidden mb-4">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-white/60 w-12">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelCrop}
                disabled={uploadingAvatar}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl glass font-semibold text-sm disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleCropAndUpload}
                disabled={uploadingAvatar}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/10 border-t-white rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Photo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <StatTile icon={Wallet} label="Net Worth" value={formatCurrencyPrivate(netWorth, true)} color="#C47D57" />
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