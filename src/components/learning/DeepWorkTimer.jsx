import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Play, Pause, Check } from 'lucide-react';

const POMODORO_SECONDS = 25 * 60;

export default function DeepWorkTimer({ courseId, courseTitle, onClose }) {
  const [topics, setTopics] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_SECONDS);
  const [running, setRunning] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const t = await base44.entities.Topic.filter({ course_id: courseId });
        setTopics(t.filter(topic => !topic.completed));
      } catch (e) { console.error(e); }
    })();
  }, [courseId]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const completeTopic = async (topic) => {
    const updated = await base44.entities.Topic.update(topic.id, { completed: true });
    setTopics(prev => prev.filter(t => t.id !== topic.id));
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pct = ((POMODORO_SECONDS - secondsLeft) / POMODORO_SECONDS) * 100;
  const radius = 88;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Deep Work</p>
          <h2 className="text-lg font-bold">{courseTitle}</h2>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {finished ? (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-copper/15 flex items-center justify-center mx-auto mb-4 glow-copper">
              <Check className="w-12 h-12 text-copper" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
            <p className="text-sm text-muted-foreground mb-6">Great focus. Take a 5-minute break.</p>
            <button onClick={onClose} className="px-8 py-3 rounded-xl bg-copper text-background font-semibold">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="relative w-48 h-48 mb-8">
              <svg width="192" height="192" className="transform -rotate-90">
                <circle cx="96" cy="96" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
                <circle
                  cx="96" cy="96" r={radius}
                  stroke="#C47D57" strokeWidth="6" fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - pct / 100)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tabular-nums" style={{ color: '#C47D57' }}>
                  {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </span>
                <button
                  onClick={() => setRunning(!running)}
                  className="mt-2 w-10 h-10 rounded-full bg-copper/15 flex items-center justify-center"
                >
                  {running ? <Pause className="w-4 h-4 text-copper" /> : <Play className="w-4 h-4 text-copper ml-0.5" />}
                </button>
              </div>
            </div>

            <div className="w-full max-w-md">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 text-center">
                Focus Topics ({topics.length} remaining)
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {topics.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">All topics completed! 🎉</p>
                ) : (
                  topics.map(topic => (
                    <div key={topic.id} className="glass rounded-xl p-3 flex items-center gap-3">
                      <button
                        onClick={() => completeTopic(topic)}
                        className="w-6 h-6 rounded-full border-2 border-copper/30 hover:border-copper flex items-center justify-center flex-shrink-0 transition-colors"
                      />
                      <span className="text-sm truncate">{topic.title}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}