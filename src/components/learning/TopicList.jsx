import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Trash2, ChevronDown, ChevronRight, Check, Circle, Calendar as CalIcon, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ProgressBar from '@/components/ProgressBar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { formatDate } from '@/lib/format';
import ScheduleDialog from '@/components/learning/ScheduleDialog';
import StudyJournalModal from '@/components/learning/StudyJournalModal';
import { useAuth } from '@/lib/AuthContext';

export default function TopicList({ courseId, courseTitle }) {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [showAdd, setShowAdd] = useState(null);
  const [newTopic, setNewTopic] = useState('');
  const [schedulingTopic, setSchedulingTopic] = useState(null);
  const [journalTopic, setJournalTopic] = useState(null);

  useEffect(() => { loadTopics(); }, [courseId]);

  const loadTopics = async () => {
    try {
      const { data: t } = await supabase.from('topics').select('*').eq('course_id', courseId).eq('user_id', user.id);
      setTopics(t || []);
    } catch (e) { console.error(e); }
  };

  const addTopic = async (parentId = null) => {
    if (!newTopic.trim()) return;
    const { data: created, error } = await supabase.from('topics').insert([{
      course_id: courseId,
      title: newTopic,
      parent_id: parentId,
      completed: false,
      order: topics.filter(t => (t.parent_id || null) === parentId).length,
      user_id: user.id,
    }]).select().single();
    if (error) throw error;
    setTopics(prev => [...prev, created]);
    setNewTopic('');
    setShowAdd(null);
  };

  const toggleTopic = async (topic) => {
    const { data: updated, error } = await supabase.from('topics').update({ completed: !topic.completed }).eq('id', topic.id).eq('user_id', user.id).select().single();
    if (error) throw error;
    setTopics(prev => prev.map(t => t.id === topic.id ? updated : t));
    if (!topic.completed) {
      setJournalTopic(updated);
    }
  };

  const deleteTopic = async (id) => {
    await supabase.from('topics').delete().eq('id', id).eq('user_id', user.id);
    setTopics(prev => prev.filter(t => t.id !== id && t.parent_id !== id));
  };

  const updateTopicJournal = (topicId, journalText) => {
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, study_journal: journalText } : t));
  };

  const mainTopics = topics.filter(t => !t.parent_id).sort((a, b) => (a.order || 0) - (b.order || 0));
  const completedCount = topics.filter(t => t.completed).length;
  const pct = topics.length > 0 ? (completedCount / topics.length) * 100 : 0;

  const renderScheduleBadge = (topic) => {
    if (!topic.scheduled_date) return null;
    return (
      <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
        <Clock className="w-2.5 h-2.5" />
        {formatDate(topic.scheduled_date)}
        {topic.scheduled_time && ` ${topic.scheduled_time}`}
      </span>
    );
  };

  const renderActions = (topic, isSub = false) => (
    <>
      <button
        onClick={() => setSchedulingTopic(topic)}
        className={`text-muted-foreground hover:text-blue-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center ${isSub ? 'opacity-0 group-hover:opacity-100' : ''}`}
        title="Schedule"
        aria-label="Schedule"
      >
        <CalIcon className="w-3 h-3" />
      </button>
      <button
        onClick={() => setShowAdd(showAdd === topic.id ? null : topic.id)}
        className={`text-muted-foreground hover:text-violet-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center ${isSub ? 'opacity-0 group-hover:opacity-100' : ''}`}
        title="Add subtopic"
        aria-label="Add subtopic"
      >
        <Plus className="w-3 h-3" />
      </button>
      <button
        onClick={() => deleteTopic(topic.id)}
        className={`text-muted-foreground hover:text-rose-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center ${isSub ? 'opacity-0 group-hover:opacity-100' : ''}`}
        title="Delete"
        aria-label="Delete"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </>
  );

  return (
    <div className="mt-3 space-y-1">
      {topics.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{completedCount}/{topics.length} topics</span>
            <span className="text-sm font-semibold text-violet-400">{Math.round(pct)}%</span>
          </div>
          <ProgressBar value={completedCount} max={topics.length} color="#8b5cf6" height={4} />
        </>
      )}

      {mainTopics.map(topic => {
        const subtopics = topics.filter(t => t.parent_id === topic.id).sort((a, b) => (a.order || 0) - (b.order || 0));
        const isExpanded = expanded === topic.id;
        return (
          <div key={topic.id}>
            <div className="flex items-center gap-2 py-2">
              {subtopics.length > 0 ? (
                <button onClick={() => setExpanded(isExpanded ? null : topic.id)} className="text-muted-foreground p-2" aria-label={isExpanded ? "Collapse" : "Expand"}>
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <div className="w-4" />
              )}
              <div className="flex-1 min-w-0">
                <button onClick={() => toggleTopic(topic)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                  {topic.completed ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className={`text-base font-medium truncate ${topic.completed ? 'line-through text-muted-foreground' : ''}`}>{topic.title}</span>
                  {renderScheduleBadge(topic)}
                </button>
                {topic.study_journal && (
                  <div className="mt-2 ml-6 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/40 text-sm italic text-neutral-300 pl-4 border-l-2 border-l-emerald-500">
                    "{topic.study_journal}"
                  </div>
                )}
              </div>
              {renderActions(topic)}
            </div>

            {isExpanded && subtopics.length > 0 && (
              <div className="ml-6 space-y-1">
                {subtopics.map(sub => (
                  <div key={sub.id} className="flex items-start gap-2 py-2 group">
                    <div className="flex-1 min-w-0">
                      <button onClick={() => toggleTopic(sub)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                        {sub.completed ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Circle className="w-3 h-3 text-muted-foreground shrink-0" />}
                        <span className={`text-sm font-medium truncate ${sub.completed ? 'line-through text-muted-foreground' : ''}`}>{sub.title}</span>
                        {renderScheduleBadge(sub)}
                      </button>
                      {sub.study_journal && (
                        <div className="mt-2 ml-5 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/40 text-sm italic text-neutral-300 pl-4 border-l-2 border-l-emerald-500">
                          "{sub.study_journal}"
                        </div>
                      )}
                    </div>
                    {renderActions(sub, true)}
                  </div>
                ))}
              </div>
            )}

            {showAdd === topic.id && (
              <div className="flex gap-1 ml-6 mt-1">
                <Input placeholder="Subtopic" value={newTopic} onChange={e => setNewTopic(e.target.value)} className="bg-white/5 border-white/10 h-8 text-sm" onKeyDown={e => e.key === 'Enter' && addTopic(topic.id)} autoFocus />
                <Button size="sm" onClick={() => addTopic(topic.id)} className="h-8 px-3 bg-violet-500 hover:bg-violet-600">Add</Button>
              </div>
            )}
          </div>
        );
      })}

      {showAdd === 'main' ? (
        <div className="flex gap-1 mt-1">
          <Input placeholder="Topic name" value={newTopic} onChange={e => setNewTopic(e.target.value)} className="bg-white/5 border-white/10 h-8 text-sm" onKeyDown={e => e.key === 'Enter' && addTopic(null)} autoFocus />
          <Button size="sm" onClick={() => addTopic(null)} className="h-8 px-3 bg-violet-500 hover:bg-violet-600">Add</Button>
        </div>
      ) : (
        <button onClick={() => { setShowAdd('main'); setNewTopic(''); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-violet-400 mt-1">
          <Plus className="w-3 h-3" /> Add topic
        </button>
      )}

      {/* Schedule Dialog */}
      <Dialog open={!!schedulingTopic} onOpenChange={(open) => !open && setSchedulingTopic(null)}>
        <DialogContent className="bg-[#0D0F14] border-white/10 max-w-sm">
          {schedulingTopic && (
            <ScheduleDialog
              topic={schedulingTopic}
              courseTitle={courseTitle}
              onClose={() => { setSchedulingTopic(null); loadTopics(); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Study Journal Dialog */}
      <Dialog open={!!journalTopic} onOpenChange={(open) => !open && setJournalTopic(null)}>
        <DialogContent className="bg-[#0D0F14] border-white/10 max-w-sm">
          {journalTopic && (
            <StudyJournalModal
              topic={journalTopic}
              onClose={() => setJournalTopic(null)}
              onUpdate={updateTopicJournal}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}