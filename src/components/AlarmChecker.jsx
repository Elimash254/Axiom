import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export default function AlarmChecker() {
  const [triggered, setTriggered] = useState(null);
  const checkedRef = useRef({});
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav'));

  useEffect(() => {
    audioRef.current.loop = true;
  }, []);

  useEffect(() => {
    const checkAlarms = async () => {
      if (localStorage.getItem('alarms_enabled') === 'false') return;
      try {
        const alarms = await base44.entities.Alarm.filter({ enabled: true });
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const dayName = now.toLocaleDateString('en', { weekday: 'short' }).toLowerCase();

        for (const alarm of alarms) {
          const key = `${alarm.id}-${currentTime}`;
          if (alarm.time === currentTime && !checkedRef.current[key]) {
            checkedRef.current[key] = true;
            const days = alarm.days || 'everyday';
            if (days === 'everyday' || days.toLowerCase().includes(dayName)) {
              setTriggered(alarm);
              audioRef.current.play().catch(err => console.log("Audio play blocked until user interaction:", err));
            }
          }
        }
      } catch (e) {
        // silent fail
      }
    };

    const interval = setInterval(checkAlarms, 5000);
    checkAlarms();
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setTriggered(null);
  };

  if (!triggered) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={handleDismiss}>
      <div className="glass-strong rounded-3xl p-8 m-6 text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4 glow-rose">
          <span className="text-3xl">⏰</span>
        </div>
        <h2 className="text-2xl font-bold mb-1">{triggered.title}</h2>
        <p className="text-muted-foreground text-sm mb-6">{triggered.time}</p>
        <button
          className="px-8 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold transition-all"
          onClick={handleDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}