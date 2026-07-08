import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Target, Check, ChevronDown, ChevronRight } from 'lucide-react';
import PullToRefresh from '@/components/PullToRefresh';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ModuleHeader from '@/components/ModuleHeader';
import EmptyState from '@/components/EmptyState';
import ProgressBar from '@/components/ProgressBar';
import { formatDate } from '@/lib/format';

const lifeAreas = {
  financial: { color: '#C47D57', label: 'Financial', icon: '💰' },
  personal_growth: { color: '#7E9D8A', label: 'Personal Growth', icon: '🌱' },
  academic: { color: '#C47D57', label: 'Academic', icon: '🎓' },
  health: { color: '#7E9D8A', label: 'Health', icon: '💪' },
  career: { color: '#ec4899', label: 'Career', icon: '🚀' },
};

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({ title: '', why: '', life_area: 'personal_growth', target_date: '' });
  const [newMilestones, setNewMilestones] = useState('');
  const [milestoneInputs, setMilestoneInputs] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [g, m] = await Promise.all([
        base44.entities.Goal.list(),
        base44.entities.Milestone.list(),
      ]);
      setGoals(g);
      setMilestones(m);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addGoal = async () => {
    if (!newGoal.title.trim()) return;
    const area = lifeAreas[newGoal.life_area];
    const tempId = 'temp-' + Date.now();
    const tempGoal = { ...newGoal, id: tempId, color: area.color, status: 'not_started', milestones_total: 0 };
    setGoals(prev => [tempGoal, ...prev]);
    setNewGoal({ title: '', why: '', life_area: 'personal_growth', target_date: '' });
    setNewMilestones('');
    setShowAdd(false);
    try {
      const created = await base44.entities.Goal.create({
        ...newGoal,
        target_date: newGoal.target_date || undefined,
        color: area.color,
        status: 'not_started',
      });

      // Create milestones
      const msTitles = newMilestones.split('\n').map(s => s.trim()).filter(Boolean);
      let createdMs = [];
      if (msTitles.length > 0) {
        createdMs = await base44.entities.Milestone.bulkCreate(
          msTitles.map((title, i) => ({ goal_id: created.id, title, order: i, completed: false }))
        );
        await base44.entities.Goal.update(created.id, { milestones_total: msTitles.length, status: 'in_progress' });
      }

      setGoals(prev => prev.map(g => g.id === tempId ? { ...created, milestones_total: msTitles.length, status: msTitles.length > 0 ? 'in_progress' : 'not_started' } : g));
      setMilestones(prev => [...prev, ...createdMs]);
    } catch (err) {
      toast.error('Something went wrong, please try again');
      setGoals(prev => prev.filter(g => g.id !== tempId));
    }
  };

  const toggleMilestone = async (ms, goalId) => {
    const updated = await base44.entities.Milestone.update(ms.id, { completed: !ms.completed });
    const newMilestones = milestones.map(m => m.id === ms.id ? { ...m, completed: !ms.completed } : m);
    setMilestones(newMilestones);

    const goalMilestones = newMilestones.filter(m => m.goal_id === goalId);
    const completed = goalMilestones.filter(m => m.completed).length;
    const total = goalMilestones.length;
    const newStatus = completed === total ? 'achieved' : completed > 0 ? 'in_progress' : 'not_started';
    await base44.entities.Goal.update(goalId, { milestones_completed: completed, milestones_total: total, status: newStatus });
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, milestones_completed: completed, milestones_total: total, status: newStatus } : g));
  };

  const addMilestone = async (goalId) => {
    const title = milestoneInputs[goalId]?.trim();
    if (!title) return;
    const created = await base44.entities.Milestone.create({ goal_id: goalId, title, completed: false, order: milestones.filter(m => m.goal_id === goalId).length });
    setMilestones(prev => [...prev, created]);

    const goalMilestones = milestones.filter(m => m.goal_id === goalId);
    const newTotal = goalMilestones.length + 1;
    await base44.entities.Goal.update(goalId, { milestones_total: newTotal, status: 'in_progress' });
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, milestones_total: newTotal, status: 'in_progress' } : g));
    setMilestoneInputs({ ...milestoneInputs, [goalId]: '' });
  };

  const deleteGoal = async (id) => {
    const goalMs = milestones.filter(m => m.goal_id === id);
    await Promise.all(goalMs.map(m => base44.entities.Milestone.delete(m.id)));
    await base44.entities.Goal.delete(id);
    setGoals(prev => prev.filter(g => g.id !== id));
    setMilestones(prev => prev.filter(m => m.goal_id !== id));
  };

  const deleteMilestone = async (id, goalId) => {
    await base44.entities.Milestone.delete(id);
    const newMilestones = milestones.filter(m => m.id !== id);
    setMilestones(newMilestones);
    const goalMs = newMilestones.filter(m => m.goal_id === goalId);
    const completed = goalMs.filter(m => m.completed).length;
    await base44.entities.Goal.update(goalId, { milestones_completed: completed, milestones_total: goalMs.length });
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, milestones_completed: completed, milestones_total: goalMs.length } : g));
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
        title="Goals"
        subtitle="Where you're going matters"
        accentColor="#C47D57"
        onAdd={() => setShowAdd(!showAdd)}
        addLabel="New"
      />

      {showAdd && (
        <div className="glass-strong rounded-2xl p-4 mb-4 space-y-3">
          <Input placeholder="Goal title (e.g. Save $10k for investment)" value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} className="bg-white/5 border-white/10" />
          <Textarea placeholder="Why does this matter? Your motivation." value={newGoal.why} onChange={e => setNewGoal({ ...newGoal, why: e.target.value })} className="bg-white/5 border-white/10 min-h-[60px]" />
          <div className="flex gap-2 flex-wrap">
            {Object.entries(lifeAreas).map(([key, area]) => (
              <button key={key} onClick={() => setNewGoal({ ...newGoal, life_area: key })} className={`px-3 py-1.5 rounded-lg text-xs ${newGoal.life_area === key ? 'text-background' : 'glass text-muted-foreground'}`} style={newGoal.life_area === key ? { backgroundColor: area.color } : {}}>
                {area.icon} {area.label}
              </button>
            ))}
          </div>
          <Input type="date" value={newGoal.target_date} onChange={e => setNewGoal({ ...newGoal, target_date: e.target.value })} className="bg-white/5 border-white/10" />
          <Textarea placeholder="Milestones (one per line)&#10;e.g. Research 3 index funds&#10;Open brokerage account&#10;Auto-invest $500/month" value={newMilestones} onChange={e => setNewMilestones(e.target.value)} className="bg-white/5 border-white/10 min-h-[80px]" />
          <Button onClick={addGoal} className="w-full bg-copper hover:bg-copper/90 text-white">Create Goal</Button>
        </div>
      )}

      {goals.length === 0 ? (
        <EmptyState title="No goals yet" subtitle="What do you want to achieve? Set your first goal and break it into milestones." action={<Button onClick={() => setShowAdd(true)} className="bg-copper hover:bg-copper/90"><Plus className="w-4 h-4 mr-1" /> Set First Goal</Button>} />
      ) : (
        <div className="space-y-3">
          {goals?.map(goal => {
            const area = lifeAreas[goal.life_area] || lifeAreas.personal_growth;
            const goalMs = milestones?.filter(m => m.goal_id === goal.id).sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
            const completed = Number(goalMs.filter(m => m.completed).length) || 0;
            const total = Number(goalMs.length) || Number(goal.milestones_total) || 1;
            const pct = total > 0 ? Math.min(100, Math.max(0, (completed / total) * 100)) : 0;
            const isExpanded = expandedGoal === goal.id;
            const isAchieved = goal.status === 'achieved';

            return (
              <div key={goal.id} className={`glass rounded-2xl p-4 ${isAchieved ? 'opacity-75' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: area.color + '20' }}>
                    <span className="text-lg">{area.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold text-sm ${isAchieved ? 'line-through' : ''}`}>{goal.title}</h3>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: area.color + '20', color: area.color }}>{area.label}</span>
                    </div>
                    {goal.target_date && <p className="text-xs text-muted-foreground mt-0.5">Target: {formatDate(goal.target_date)}</p>}
                    {goal.why && <p className="text-xs text-muted-foreground mt-1 italic">"{goal.why}"</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setExpandedGoal(isExpanded ? null : goal.id)} className="text-muted-foreground hover:text-foreground p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={isExpanded ? "Collapse" : "Expand"}>
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteGoal(goal.id)} className="text-muted-foreground hover:text-rose-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="mt-3 ml-12">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">{completed}/{total} milestones</span>
                    <span className="text-xs font-semibold" style={{ color: area.color }}>{Math.round(pct)}%</span>
                  </div>
                  <ProgressBar value={completed} max={total} color={area.color} height={6} />
                </div>

                {isAchieved && <div className="mt-3 text-center text-xs font-semibold text-sage">🏆 Goal Achieved!</div>}

                {isExpanded && (
                  <div className="mt-4 space-y-2 pl-1">
                    {goalMs.map(ms => (
                      <div key={ms.id} className="flex items-center gap-3 py-2">
                        <input 
                          type="checkbox" 
                          checked={ms.completed} 
                          onChange={() => toggleMilestone(ms, goal.id)} 
                          className="w-5 h-5 rounded border-neutral-700 bg-neutral-800 accent-[#C47D57]" 
                        />
                        <span className={`text-base font-medium flex-1 ${ms.completed ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>{ms.title}</span>
                        <button onClick={() => deleteMilestone(ms.id, goal.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <Input placeholder="Add milestone..." value={milestoneInputs[goal.id] || ''} onChange={e => setMilestoneInputs({ ...milestoneInputs, [goal.id]: e.target.value })} onKeyDown={e => e.key === 'Enter' && addMilestone(goal.id)} className="bg-white/5 border-white/10 h-8 text-sm" />
                      <Button size="sm" onClick={() => addMilestone(goal.id)} className="bg-white/10 hover:bg-white/15 h-8 px-3"><Plus className="w-3 h-3" /></Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    </PullToRefresh>
    </motion.div>
  );
}