import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Check, Flame, Plus, Trash2, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ModuleHeader from '@/components/ModuleHeader';
import EmptyState from '@/components/EmptyState';
import PullToRefresh from '@/components/PullToRefresh';
import toast from 'react-hot-toast';
import { todayStr, getStreakData } from '@/lib/format';

const categories = {
  health: { color: '#7E9D8A', label: 'Health' },
  mind: { color: '#C47D57', label: 'Mind' },
  discipline: { color: '#C47D57', label: 'Discipline' },
  social: { color: '#ec4899', label: 'Social' }
};

export default function Habits() {
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', category: 'discipline', frequency: 'daily', description: '' });
  const [allLogs, setAllLogs] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [h, hl] = await Promise.all([
      base44.entities.Habit.filter({ active: true }),
      base44.entities.HabitLog.list('-date', 500)]
      );
      setHabits(h);
      setAllLogs(hl);
      setLogs(hl.filter((l) => l.date === todayStr()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (habit) => {
    const today = todayStr();
    const existing = logs.find((l) => l.habit_id === habit.id && l.date === today);

    if (existing) {
      await base44.entities.HabitLog.delete(existing.id);
      setLogs(logs.filter((l) => l.id !== existing.id));
      setAllLogs(allLogs.filter((l) => l.id !== existing.id));
      // Decrement streak
      const currentStreak = Number(habit.current_streak) || 0;
      const newStreak = Math.max(0, currentStreak - 1);
      await base44.entities.Habit.update(habit.id, { current_streak: newStreak, last_completed_date: null });
      setHabits(habits.map((h) => h.id === habit.id ? { ...h, current_streak: newStreak, last_completed_date: null } : h));
    } else {
      const created = await base44.entities.HabitLog.create({
        habit_id: habit.id,
        habit_name: habit.name,
        date: today,
        status: 'completed'
      });
      setLogs([...logs, created]);
      setAllLogs([...allLogs, created]);
      // Increment streak
      const currentStreak = Number(habit.current_streak) || 0;
      const longestStreak = Number(habit.longest_streak) || 0;
      const newStreak = currentStreak + 1;
      const newLongest = Math.max(longestStreak, newStreak);
      await base44.entities.Habit.update(habit.id, {
        current_streak: newStreak,
        longest_streak: newLongest,
        last_completed_date: today
      });
      setHabits(habits.map((h) => h.id === habit.id ? { ...h, current_streak: newStreak, longest_streak: newLongest, last_completed_date: today } : h));
    }
  };

  const addHabit = async () => {
    if (!newHabit.name.trim()) return;
    const cat = categories[newHabit.category];
    const tempId = 'temp-' + Date.now();
    const tempHabit = { ...newHabit, id: tempId, color: cat.color, icon: 'CheckCircle', current_streak: 0, longest_streak: 0, active: true, last_completed_date: null };
    setHabits([...habits, tempHabit]);
    setNewHabit({ name: '', category: 'discipline', frequency: 'daily', description: '' });
    setShowAdd(false);
    try {
      const created = await base44.entities.Habit.create({
        ...newHabit,
        color: cat.color,
        icon: 'CheckCircle'
      });
      setHabits(prev => prev.map(h => h.id === tempId ? created : h));
    } catch (err) {
      toast.error('Something went wrong, please try again');
      setHabits(prev => prev.filter(h => h.id !== tempId));
    }
  };

  const deleteHabit = async (id) => {
    await base44.entities.Habit.update(id, { active: false });
    setHabits(habits.filter((h) => h.id !== id));
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin"></div></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
    <PullToRefresh onRefresh={loadData}>
    <div className="px-5 pt-12 pb-8">
      <ModuleHeader
        title="Habits"
        subtitle="Consistency builds character"
        accentColor="#7E9D8A"
        onAdd={() => setShowAdd(!showAdd)}
        addLabel="New" />
      

      {showAdd &&
      <div className="glass-strong rounded-2xl p-4 mb-4 space-y-3">
          <Input
          placeholder="Habit name (e.g. Morning Workout)"
          value={newHabit.name}
          onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
          autoFocus
          className="bg-white/5 border-white/10" />
        
          <Input
          placeholder="Description (optional)"
          value={newHabit.description}
          onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
          className="bg-white/5 border-white/10" />
        
          <div className="flex gap-2 flex-wrap">
            {Object.entries(categories).map(([key, cat]) =>
          <button
            key={key}
            onClick={() => setNewHabit({ ...newHabit, category: key })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            newHabit.category === key ? 'text-white' : 'glass text-muted-foreground'}`
            }
            style={newHabit.category === key ? { backgroundColor: cat.color, color: '#1A1A17' } : {}}>
            
                {cat.label}
              </button>
          )}
          </div>
          <div className="flex gap-2">
            <Button onClick={addHabit} className="flex-1 bg-sage hover:bg-sage/90 text-background">Add Habit</Button>
            <Button onClick={() => setShowAdd(false)} variant="outline" className="glass border-white/10">Cancel</Button>
          </div>
        </div>
      }

      {habits.length === 0 ?
      <EmptyState
        title="No habits yet"
        subtitle="Start with one small habit. Consistency beats intensity."
        action={<Button onClick={() => setShowAdd(true)} className="bg-sage hover:bg-sage/90 text-background"><Plus className="w-4 h-4 mr-1" /> Create First Habit</Button>} /> :


      <div className="space-y-3">
          {habits.map((habit) => {
          const isDone = logs.some((l) => l.habit_id === habit.id && l.status === 'completed');
          const { streak, last7 } = getStreakData(allLogs, habit.id);
          const cat = categories[habit.category] || categories.discipline;

          return (
            <div key={habit.id} className={`glass rounded-2xl p-4 transition-all ${isDone ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3">
                  <button
                  onClick={() => toggleHabit(habit)}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all no-tap-highlight bg-[hsl(var(--background))] text-[hsl(var(--background))] ${
                  isDone ? 'border-transparent' : 'border-white/20'}`
                  }
                  style={isDone ? { backgroundColor: habit.color } : {}}>
                  
                    {isDone && <Check className="w-4 h-4 text-background" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${isDone ? 'line-through text-muted-foreground' : ''}`}>{habit.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cat.color + '20', color: cat.color }}>{cat.label}</span>
                    </div>
                    {habit.description && <p className="text-xs text-muted-foreground truncate">{habit.description}</p>}
                  </div>
                  {streak > 0 &&
                <div className="flex items-center gap-1 text-copper">
                      <Flame className="w-4 h-4" />
                      <span className="text-sm font-bold">{streak}</span>
                    </div>
                }
                  <button onClick={() => deleteHabit(habit.id)} className="text-muted-foreground hover:text-rose-400 transition-colors p-2" aria-label="Delete">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
                {/* Last 7 days */}
                <div className="flex items-center gap-1.5 mt-3 ml-10">
                  {last7.map((done, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                        <div
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{
                          backgroundColor: done ? habit.color : 'rgba(255,255,255,0.05)'
                        }}>
                        
                          {done && <Check className="w-3 h-3 text-background" strokeWidth={3} />}
                        </div>
                        <span className="text-[8px] text-muted-foreground">{d.toLocaleDateString('en', { weekday: 'narrow' })}</span>
                      </div>);

                })}
                </div>
              </div>);

        })}
        </div>
      }
    </div>
    </PullToRefresh>
    </motion.div>
  );
}
