import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Clock, Bell, Calendar as CalIcon, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import PullToRefresh from '@/components/PullToRefresh';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModuleHeader from '@/components/ModuleHeader';
import EmptyState from '@/components/EmptyState';
import { formatDate, todayStr } from '@/lib/format';

const eventCategories = {
  academic: { color: '#10B981', label: 'Academic' },
  personal: { color: '#7E9D8A', label: 'Personal' },
  work: { color: '#C47D57', label: 'Work' },
  health: { color: '#7E9D8A', label: 'Health' },
  social: { color: '#ec4899', label: 'Social' },
  finance: { color: '#C47D57', label: 'Finance' },
  reminder: { color: '#f43f5e', label: 'Reminder' },
};

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showAdd, setShowAdd] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: todayStr(), time: '', end_time: '', category: 'personal' });
  const [newAlarm, setNewAlarm] = useState({ title: '', time: '07:00', days: 'everyday' });
  const [newReview, setNewReview] = useState({ week_starting: todayStr(), habit_hit_rate: 0, milestones_completed: 0, finance_delta: 0, biggest_win: '', improve_next: '', reflection: '' });
  const [editingReviewId, setEditingReviewId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [e, a, r] = await Promise.all([
        base44.entities.CalendarEvent.list('-date', 200),
        base44.entities.Alarm.list(),
        base44.entities.WeeklyReview.list('-week_starting', 10),
      ]);
      setEvents(e);
      setAlarms(a);
      setReviews(r);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addEvent = async () => {
    if (!newEvent.title.trim()) return;
    const cat = eventCategories[newEvent.category];
    const tempId = 'temp-' + Date.now();
    const tempEvent = { ...newEvent, id: tempId, color: cat.color };
    setEvents(prev => [tempEvent, ...prev]);
    setNewEvent({ title: '', description: '', date: todayStr(), time: '', end_time: '', category: 'personal' });
    setShowAdd(null);
    try {
      const created = await base44.entities.CalendarEvent.create({ ...newEvent, color: cat.color });
      setEvents(prev => prev.map(e => e.id === tempId ? created : e));
    } catch (err) {
      toast.error('Something went wrong, please try again');
      setEvents(prev => prev.filter(e => e.id !== tempId));
    }
  };

  const addAlarm = async () => {
    if (!newAlarm.title.trim()) return;
    const tempId = 'temp-' + Date.now();
    const tempAlarm = { ...newAlarm, id: tempId, color: '#f43f5e', enabled: true };
    setAlarms(prev => [tempAlarm, ...prev]);
    setNewAlarm({ title: '', time: '07:00', days: 'everyday' });
    setShowAdd(null);
    try {
      const created = await base44.entities.Alarm.create({ ...newAlarm, color: '#f43f5e' });
      setAlarms(prev => prev.map(a => a.id === tempId ? created : a));
    } catch (err) {
      toast.error('Something went wrong, please try again');
      setAlarms(prev => prev.filter(a => a.id !== tempId));
    }
  };

  const toggleAlarm = async (alarm) => {
    await base44.entities.Alarm.update(alarm.id, { enabled: !alarm.enabled });
    setAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, enabled: !alarm.enabled } : a));
  };

  const addReview = async () => {
    try {
      if (editingReviewId) {
        // Update existing review
        const updated = await base44.entities.WeeklyReview.update(editingReviewId, {
          ...newReview,
          habit_hit_rate: Number(newReview.habit_hit_rate),
          milestones_completed: Number(newReview.milestones_completed),
          finance_delta: Number(newReview.finance_delta),
        });
        setReviews(prev => prev.map(r => r.id === editingReviewId ? updated : r));
        toast.success('Weekly review updated!');
      } else {
        // Create new review
        const created = await base44.entities.WeeklyReview.create({
          ...newReview,
          habit_hit_rate: Number(newReview.habit_hit_rate),
          milestones_completed: Number(newReview.milestones_completed),
          finance_delta: Number(newReview.finance_delta),
        });
        setReviews(prev => [created, ...prev]);
        toast.success('Weekly review saved!');
      }
      setNewReview({ week_starting: todayStr(), habit_hit_rate: 0, milestones_completed: 0, finance_delta: 0, biggest_win: '', improve_next: '', reflection: '' });
      setEditingReviewId(null);
      setShowAdd(null);
    } catch (err) {
      console.error('Error saving review:', err);
      toast.error('Failed to save review');
    }
  };

  const editReview = (review) => {
    setNewReview({
      week_starting: review.week_starting,
      habit_hit_rate: review.habit_hit_rate || 0,
      milestones_completed: review.milestones_completed || 0,
      finance_delta: review.finance_delta || 0,
      biggest_win: review.biggest_win || '',
      improve_next: review.improve_next || '',
      reflection: review.reflection || '',
    });
    setEditingReviewId(review.id);
    setShowAdd('review');
  };

  const deleteReview = async (id) => {
    try {
      await base44.entities.WeeklyReview.delete(id);
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success('Review deleted');
    } catch (err) {
      console.error('Error deleting review:', err);
      toast.error('Failed to delete review');
    }
  };

  const deleteEvent = async (id) => { await base44.entities.CalendarEvent.delete(id); setEvents(prev => prev.filter(e => e.id !== id)); };
  const deleteAlarm = async (id) => { await base44.entities.Alarm.delete(id); setAlarms(prev => prev.filter(a => a.id !== id)); };

  // Calendar grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const eventsForDate = (dateStr) => events.filter(e => e.date === dateStr);
  const selectedEvents = eventsForDate(selectedDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

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
        title="Agenda"
        subtitle="Time is your most valuable asset"
        accentColor="#f43f5e"
        onAdd={() => setShowAdd(showAdd === 'event' ? null : 'event')}
        addLabel="Event"
      />

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/5 mb-4 h-10">
          <TabsTrigger value="calendar" className="text-xs">Calendar</TabsTrigger>
          <TabsTrigger value="alarms" className="text-xs">Alarms</TabsTrigger>
          <TabsTrigger value="review" className="text-xs">Review</TabsTrigger>
        </TabsList>

        {/* Calendar */}
        <TabsContent value="calendar" className="space-y-4">
          {showAdd === 'event' && (
            <div className="glass-strong rounded-2xl p-4 space-y-2">
              <Input placeholder="Event title" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} className="bg-white/5 border-white/10" />
              <Input type="date" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} className="bg-white/5 border-white/10" />
              <div className="flex gap-2">
                <Input type="time" value={newEvent.time} onChange={e => setNewEvent({ ...newEvent, time: e.target.value })} className="bg-white/5 border-white/10" />
                <Input type="time" placeholder="End" value={newEvent.end_time} onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })} className="bg-white/5 border-white/10" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(eventCategories).map(([key, cat]) => (
                  <button key={key} onClick={() => setNewEvent({ ...newEvent, category: key })} className={`px-2 py-1 rounded-lg text-xs ${newEvent.category === key ? 'text-background' : 'glass text-muted-foreground'}`} style={newEvent.category === key ? { backgroundColor: cat.color } : {}}>{cat.label}</button>
                ))}
              </div>
              <Input placeholder="Notes (optional)" value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} className="bg-white/5 border-white/10" />
              <Button onClick={addEvent} className="w-full bg-rose-500 hover:bg-rose-600 text-white">Add Event</Button>
            </div>
          )}

          {/* Month grid */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Previous month"><ChevronLeft className="w-5 h-5" /></button>
              <h3 className="font-semibold">{monthName}</h3>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Next month"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {days.map((d, i) => <div key={i} className="text-center text-xs text-muted-foreground font-medium">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvents = eventsForDate(dateStr);
                const isToday = dateStr === todayStr();
                const isSelected = dateStr === selectedDate;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-rose-500 text-white' : isToday ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <span className={`text-xs ${isSelected ? 'font-bold' : ''}`}>{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((e, idx) => (
                          <div key={idx} className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? 'white' : e.color || '#f43f5e' }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day events */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">{formatDate(selectedDate)}</h3>
            {selectedEvents.length === 0 ? (
              <div className="glass rounded-xl p-4 text-center"><p className="text-sm text-muted-foreground">No events scheduled</p></div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map(ev => {
                  const cat = eventCategories[ev.category] || eventCategories.personal;
                  return (
                    <div key={ev.id} className="glass rounded-xl p-3 flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: ev.color || cat.color }}></div>
                      {ev.time && <div className="text-center"><p className="text-xs font-semibold">{ev.time}</p>{ev.end_time && <p className="text-xs text-muted-foreground">{ev.end_time}</p>}</div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{ev.title}</p>
                        {ev.description && <p className="text-xs text-muted-foreground truncate">{ev.description}</p>}
                      </div>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cat.color + '20', color: cat.color }}>{cat.label}</span>
                      <button onClick={() => deleteEvent(ev.id)} className="text-muted-foreground hover:text-rose-400 p-2" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Alarms */}
        <TabsContent value="alarms" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Reminders</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(showAdd === 'alarm' ? null : 'alarm')} className="text-rose-400 text-xs"><Plus className="w-3 h-3" /> Add</Button>
          </div>
          {showAdd === 'alarm' && (
            <div className="glass-strong rounded-2xl p-4 space-y-2">
              <Input placeholder="Alarm title (e.g. Morning Routine)" value={newAlarm.title} onChange={e => setNewAlarm({ ...newAlarm, title: e.target.value })} className="bg-white/5 border-white/10" />
              <Input type="time" value={newAlarm.time} onChange={e => setNewAlarm({ ...newAlarm, time: e.target.value })} className="bg-white/5 border-white/10" />
              <div className="flex gap-2 flex-wrap">
                {['everyday', 'mon,tue,wed,thu,fri', 'sat,sun'].map(d => (
                  <button key={d} onClick={() => setNewAlarm({ ...newAlarm, days: d })} className={`px-2 py-1 rounded-lg text-xs ${newAlarm.days === d ? 'bg-rose-500 text-white' : 'glass text-muted-foreground'}`}>{d === 'everyday' ? 'Every day' : d === 'mon,tue,wed,thu,fri' ? 'Weekdays' : 'Weekends'}</button>
                ))}
              </div>
              <Button onClick={addAlarm} className="w-full bg-rose-500 hover:bg-rose-600 text-white">Add Alarm</Button>
            </div>
          )}
          {alarms.length === 0 ? (
            <EmptyState title="No alarms" subtitle="Set reminders for habits, events, and important moments." />
          ) : (
            alarms.map(alarm => (
              <div key={alarm.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center"><Bell className="w-5 h-5 text-rose-400" /></div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{alarm.title}</p>
                  <p className="text-xs text-muted-foreground">{alarm.time} · {alarm.days}</p>
                </div>
                <button onClick={() => toggleAlarm(alarm)} className={`w-11 h-6 rounded-full transition-all relative ${alarm.enabled ? 'bg-rose-500' : 'bg-white/10'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${alarm.enabled ? 'left-5' : 'left-0.5'}`} />
                </button>
                <button onClick={() => deleteAlarm(alarm.id)} className="text-muted-foreground hover:text-rose-400 p-2" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))
          )}
        </TabsContent>

        {/* Weekly Review */}
        <TabsContent value="review" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Weekly Reviews</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(showAdd === 'review' ? null : 'review')} className="text-copper text-xs"><Plus className="w-3 h-3" /> New</Button>
          </div>
          {showAdd === 'review' && (
            <div className="glass-strong rounded-2xl p-4 space-y-2">
              <Input type="date" value={newReview.week_starting} onChange={e => setNewReview({ ...newReview, week_starting: e.target.value })} className="bg-white/5 border-white/10" />
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-xs text-muted-foreground">Habit Hit %</label><Input type="number" value={newReview.habit_hit_rate} onChange={e => setNewReview({ ...newReview, habit_hit_rate: e.target.value })} className="bg-white/5 border-white/10 h-8 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground">Milestones</label><Input type="number" value={newReview.milestones_completed} onChange={e => setNewReview({ ...newReview, milestones_completed: e.target.value })} className="bg-white/5 border-white/10 h-8 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground">Finance Δ</label><Input type="number" value={newReview.finance_delta} onChange={e => setNewReview({ ...newReview, finance_delta: e.target.value })} className="bg-white/5 border-white/10 h-8 text-sm" /></div>
              </div>
              <Input placeholder="Biggest win this week" value={newReview.biggest_win} onChange={e => setNewReview({ ...newReview, biggest_win: e.target.value })} className="bg-white/5 border-white/10" />
              <Input placeholder="What to improve" value={newReview.improve_next} onChange={e => setNewReview({ ...newReview, improve_next: e.target.value })} className="bg-white/5 border-white/10" />
              <Textarea placeholder="Reflection..." value={newReview.reflection} onChange={e => setNewReview({ ...newReview, reflection: e.target.value })} className="bg-white/5 border-white/10 min-h-[60px]" />
              <Button onClick={addReview} className="w-full bg-copper hover:bg-copper/90 text-background">{editingReviewId ? 'Update Review' : 'Save Review'}</Button>
            </div>
          )}
          {reviews.length === 0 ? (
            <EmptyState title="No reviews yet" subtitle="End each week with a 5-minute reflection. This is your accountability loop." />
          ) : (
            reviews.map(r => (
              <div key={r.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-copper" />
                    <span className="text-sm font-semibold">Week of {formatDate(r.week_starting)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => editReview(r)} className="text-muted-foreground hover:text-copper p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => deleteReview(r.id)} className="text-muted-foreground hover:text-rose-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center glass rounded-lg p-2"><p className="text-xs text-muted-foreground">Habit Hit</p><p className="text-sm font-bold text-emerald-400">{r.habit_hit_rate || 0}%</p></div>
                  <div className="text-center glass rounded-lg p-2"><p className="text-xs text-muted-foreground">Milestones</p><p className="text-sm font-bold text-blue-400">{r.milestones_completed || 0}</p></div>
                  <div className="text-center glass rounded-lg p-2"><p className="text-xs text-muted-foreground">Finance Δ</p><p className={`text-sm font-bold ${(r.finance_delta || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{(r.finance_delta || 0) >= 0 ? '+' : ''}${r.finance_delta || 0}</p></div>
                </div>
                {r.biggest_win && <div className="mb-2"><p className="text-xs text-muted-foreground uppercase">Biggest Win</p><p className="text-sm">{r.biggest_win}</p></div>}
                {r.improve_next && <div className="mb-2"><p className="text-xs text-muted-foreground uppercase">Improve Next</p><p className="text-sm">{r.improve_next}</p></div>}
                {r.reflection && <div><p className="text-xs text-muted-foreground uppercase">Reflection</p><p className="text-sm italic text-muted-foreground">{r.reflection}</p></div>}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
    </PullToRefresh>
    </motion.div>
  );
}