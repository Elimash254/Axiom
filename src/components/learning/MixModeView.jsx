import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shuffle, Check, X } from 'lucide-react';

export default function MixModeView({ courses, onExit }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const all = [];
      for (const course of courses) {
        const t = await base44.entities.Topic.filter({ course_id: course.id });
        t.filter(topic => !topic.completed).forEach(topic => {
          all.push({ ...topic, courseTitle: course.title });
        });
      }
      const shuffled = [...all].sort(() => Math.random() - 0.5);
      setTopics(shuffled);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTopics(); }, []);

  const completeTopic = async (topic) => {
    await base44.entities.Topic.update(topic.id, { completed: true });
    setTopics(prev => prev.filter(t => t.id !== topic.id));
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Shuffling topics...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Mix Mode</h3>
          <p className="text-xs text-muted-foreground">Interleaved topics across courses</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadTopics} className="w-9 h-9 rounded-xl glass flex items-center justify-center">
            <Shuffle className="w-4 h-4 text-sage" />
          </button>
          <button onClick={onExit} className="w-9 h-9 rounded-xl glass flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm text-muted-foreground">No incomplete topics found across your units.</p>
        </div>
      ) : (
        topics.map((topic, i) => (
          <div key={topic.id} className="glass rounded-2xl p-4 flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground w-6">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{topic.title}</p>
              <span className="text-[10px] text-sage bg-sage/10 px-1.5 py-0.5 rounded-full">{topic.courseTitle}</span>
            </div>
            <button
              onClick={() => completeTopic(topic)}
              className="w-8 h-8 rounded-full bg-sage/15 hover:bg-sage/25 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Check className="w-4 h-4 text-sage" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}