import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';
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
import { soundService } from '@/lib/soundService';

const lifeAreas = {
  financial: { color: '#C47D57', label: 'Financial', icon: '💰' },
  personal_growth: { color: '#10B981', label: 'Personal Growth', icon: '🌱' },
  academic: { color: '#10B981', label: 'Academic', icon: '🎓' },
  health: { color: '#7E9D8A', label: 'Health', icon: '💪' },
  career: { color: '#ec4899', label: 'Career', icon: '🚀' },
};

export default function Goals() {
  const { user, isAuthenticated } = useAuth();
  const [goals, setGoals] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({ title: '', why: '', life_area: 'personal_growth', target_date: '' });
  const [newMilestones, setNewMilestones] = useState('');
  const [milestoneInputs, setMilestoneInputs] = useState({});

  useEffect(() => { 
    if (user && isAuthenticated) {
      console.log('[Goals] Loading data for user:', user.id);
      loadData(); 
    } else {
      console.log('[Goals] Skipping load - user:', !!user, 'authenticated:', isAuthenticated);
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  // Clear data when user logs out
  useEffect(() => {
    if (!user || !isAuthenticated) {
      console.log('[Goals] User logged out, clearing data');
      setGoals([]);
      setMilestones([]);
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  const loadData = async () => {
    try {
      console.log('[Goals] Starting data fetch...');
      
      // Fetch goals with explicit column selection
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, user_id, title, why, life_area, target_date, color, status, milestones_total, milestones_completed, created_at')
        .eq('user_id', user.id);
      
      if (goalsError) {
        console.error('[Goals] Error fetching goals:', goalsError);
        throw goalsError;
      }
      
      // Fetch milestones with explicit column selection
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('id, user_id, goal_id, title, completed, order, created_at')
        .eq('user_id', user.id);
      
      if (milestonesError) {
        console.error('[Goals] Error fetching milestones:', milestonesError);
        throw milestonesError;
      }
      
      console.log('[Goals] Goals fetched:', goalsData?.length || 0, 'items');
      console.log('[Goals] Milestones fetched:', milestonesData?.length || 0, 'items');
      console.log('[Goals] Goals data:', goalsData);
      console.log('[Goals] Milestones data:', milestonesData);
      
      // Convert snake_case to camelCase for compatibility with existing code
      const camelGoals = goalsData?.map(g => ({
        id: g.id,
        userId: g.user_id,
        title: g.title,
        why: g.why,
        lifeArea: g.life_area,
        targetDate: g.target_date,
        color: g.color,
        status: g.status,
        milestonesTotal: g.milestones_total,
        milestonesCompleted: g.milestones_completed,
        createdAt: g.created_at
      })) || [];
      
      const camelMilestones = milestonesData?.map(m => ({
        id: m.id,
        userId: m.user_id,
        goalId: m.goal_id,
        title: m.title,
        completed: m.completed,
        order: m.order,
        createdAt: m.created_at
      })) || [];
      
      setGoals(camelGoals);
      setMilestones(camelMilestones);
    } catch (err) {
      console.error('[Goals] Error loading data:', err);
      toast.error('Failed to load goals data');
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async () => {
    if (!newGoal.title.trim()) return;
    const area = lifeAreas[newGoal.life_area];
    const tempId = 'temp-' + Date.now();
    const tempGoal = { ...newGoal, id: tempId, color: area.color, status: 'not_started', milestonesTotal: 0 };
    setGoals(prev => [tempGoal, ...prev]);
    setNewGoal({ title: '', why: '', life_area: 'personal_growth', target_date: '' });
    setNewMilestones('');
    setShowAdd(false);
    try {
      const { data: created, error: createError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: newGoal.title,
          why: newGoal.why,
          life_area: newGoal.life_area,
          target_date: newGoal.target_date || null,
          color: area.color,
          status: 'not_started',
          milestones_total: 0,
          milestones_completed: 0,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create milestones
      const msTitles = newMilestones.split('\n').map(s => s.trim()).filter(Boolean);
      let createdMs = [];
      if (msTitles.length > 0) {
        console.log('[Goals] Bulk creating milestones for goal:', created.id, msTitles);
        const { data: milestoneData, error: milestoneError } = await supabase
          .from('milestones')
          .insert(
            msTitles.map((title, i) => ({
              user_id: user.id,
              goal_id: created.id,
              title,
              order: i,
              completed: false,
            }))
          )
          .select();

        if (milestoneError) throw milestoneError;

        createdMs = milestoneData.map(m => ({
          id: m.id,
          userId: m.user_id,
          goalId: m.goal_id,
          title: m.title,
          completed: m.completed,
          order: m.order,
          createdAt: m.created_at
        }));

        console.log('[Goals] Bulk milestones created successfully:', createdMs);

        // Update goal with milestone count
        const { error: updateError } = await supabase
          .from('goals')
          .update({ milestones_total: msTitles.length, status: 'in_progress' })
          .eq('id', created.id);

        if (updateError) throw updateError;
      }

      const camelGoal = {
        id: created.id,
        userId: created.user_id,
        title: created.title,
        why: created.why,
        lifeArea: created.life_area,
        targetDate: created.target_date,
        color: created.color,
        status: created.status,
        milestonesTotal: msTitles.length,
        milestonesCompleted: 0,
        createdAt: created.created_at
      };

      setGoals(prev => prev.map(g => String(g.id) === tempId ? { ...camelGoal, milestonesTotal: msTitles.length, status: msTitles.length > 0 ? 'in_progress' : 'not_started' } : g));
      setMilestones(prev => [...prev, ...createdMs]);
    } catch (err) {
      console.error('[Goals] Error creating goal:', err);
      toast.error('Something went wrong, please try again');
      setGoals(prev => prev.filter(g => String(g.id) !== tempId));
    }
  };

  const toggleMilestone = async (ms, goalId) => {
    const { error: updateError } = await supabase
      .from('milestones')
      .update({ completed: !ms.completed })
      .eq('id', ms.id)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    const newMilestones = milestones.map(m => String(m.id) === String(ms.id) ? { ...m, completed: !ms.completed } : m);
    setMilestones(newMilestones);

    const goalIdStr = String(goalId);
    const goalMilestones = newMilestones.filter(m => String(m.goalId) === goalIdStr);
    const completed = goalMilestones.filter(m => m.completed).length;
    const total = goalMilestones.length;
    const newStatus = completed === total ? 'achieved' : completed > 0 ? 'in_progress' : 'not_started';

    const { error: goalUpdateError } = await supabase
      .from('goals')
      .update({ milestones_completed: completed, milestones_total: total, status: newStatus })
      .eq('id', goalId)
      .eq('user_id', user.id);

    if (goalUpdateError) throw goalUpdateError;

    setGoals(prev => prev.map(g => String(g.id) === goalIdStr ? { ...g, milestonesCompleted: completed, milestonesTotal: total, status: newStatus } : g));
    
    // Play success sound when milestone is completed
    if (!ms.completed) {
      soundService.init();
      soundService.playNotification('success');
    }
  };

  const addMilestone = async (goalId) => {
    const title = milestoneInputs[goalId]?.trim();
    if (!title) return;
    const goalIdStr = String(goalId);
    const currentOrder = milestones.filter(m => String(m.goalId) === goalIdStr).length;
    console.log('[Goals] Creating milestone:', { goalId: goalIdStr, title, order: currentOrder });

    const { data: created, error: createError } = await supabase
      .from('milestones')
      .insert({
        user_id: user.id,
        goal_id: goalIdStr,
        title,
        completed: false,
        order: currentOrder,
      })
      .select()
      .single();

    if (createError) throw createError;

    const camelMilestone = {
      id: created.id,
      userId: created.user_id,
      goalId: created.goal_id,
      title: created.title,
      completed: created.completed,
      order: created.order,
      createdAt: created.created_at
    };

    console.log('[Goals] Milestone created successfully:', camelMilestone);
    setMilestones(prev => [...prev, camelMilestone]);

    // Calculate new total after adding the milestone
    const newTotal = currentOrder + 1;
    const { error: goalUpdateError } = await supabase
      .from('goals')
      .update({ milestones_total: newTotal, status: 'in_progress' })
      .eq('id', goalId)
      .eq('user_id', user.id);

    if (goalUpdateError) throw goalUpdateError;

    setGoals(prev => prev.map(g => String(g.id) === goalIdStr ? { ...g, milestonesTotal: newTotal, status: 'in_progress' } : g));
    setMilestoneInputs({ ...milestoneInputs, [goalId]: '' });
  };

  const deleteGoal = async (id) => {
    const idStr = String(id);
    const goalMs = milestones.filter(m => String(m.goalId) === idStr);
    
    // Delete all milestones for this goal
    await Promise.all(goalMs.map(m => 
      supabase
        .from('milestones')
        .delete()
        .eq('id', m.id)
        .eq('user_id', user.id)
    ));
    
    // Delete the goal
    const { error: deleteError } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    setGoals(prev => prev.filter(g => String(g.id) !== idStr));
    setMilestones(prev => prev.filter(m => String(m.goalId) !== idStr));
  };

  const deleteMilestone = async (id, goalId) => {
    const { error: deleteError } = await supabase
      .from('milestones')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    const newMilestones = milestones.filter(m => String(m.id) !== String(id));
    setMilestones(newMilestones);
    const goalIdStr = String(goalId);
    const goalMs = newMilestones.filter(m => String(m.goalId) === goalIdStr);
    const completed = goalMs.filter(m => m.completed).length;

    const { error: goalUpdateError } = await supabase
      .from('goals')
      .update({ milestones_completed: completed, milestones_total: goalMs.length })
      .eq('id', goalId)
      .eq('user_id', user.id);

    if (goalUpdateError) throw goalUpdateError;

    setGoals(prev => prev.map(g => String(g.id) === goalIdStr ? { ...g, milestonesCompleted: completed, milestonesTotal: goalMs.length } : g));
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin"></div></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
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
            const area = lifeAreas[goal.lifeArea] || lifeAreas.personal_growth;
            const goalMs = milestones?.filter(m => String(m.goalId) === String(goal.id)).sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
            console.log(`Goal ${goal.id} (${goal.title}):`, { goalId: goal.id, goalIdType: typeof goal.id, milestones: milestones, filteredMilestones: goalMs });
            const completed = goalMs.filter(m => m.completed).length || 0;
            const total = goalMs.length || Number(goal.milestonesTotal) || 0;
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
                    {goal.targetDate && <p className="text-xs text-muted-foreground mt-0.5">Target: {formatDate(goal.targetDate)}</p>}
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