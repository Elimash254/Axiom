import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export default function AlarmChecker() {
  const checkedRef = useRef({});

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const checkAlarms = async () => {
      if (localStorage.getItem('alarms_enabled') === 'false') return;
      if ('Notification' in window && Notification.permission !== 'granted') return;
      
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
              // Use native browser notification instead of in-app modal
              new Notification("Axiom System Alarm", {
                body: alarm.title,
                icon: "/icon.png",
                tag: alarm.id,
                requireInteraction: true
              });
            }
          }
        }
      } catch (e) {
        console.error('Error checking alarms:', e);
      }
    };

    const interval = setInterval(checkAlarms, 5000);
    checkAlarms();
    return () => clearInterval(interval);
  }, []);

  // Component no longer renders anything - notifications are handled by browser
  return null;
}