import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BookOpen, Save } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

export default function StudyJournalModal({ topic, onClose, onUpdate }) {
  const { user } = useAuth();
  const [entry, setEntry] = useState(topic.study_journal || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('topics').update({ study_journal: entry }).eq('id', topic.id).eq('user_id', user.id);
      if (error) throw error;
      onUpdate(topic.id, entry);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="w-4 h-4 text-sage" />
        <p className="text-sm font-medium">Study Journal</p>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">"{topic.title}"</p>
      <p className="text-sm">What was the most challenging part of this topic?</p>
      <Textarea
        value={entry}
        onChange={e => setEntry(e.target.value)}
        placeholder="Reflect on what you found difficult..."
        className="bg-white/5 border-white/10 min-h-[100px]"
        autoFocus
      />
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving} className="flex-1 bg-sage hover:bg-sage/90 text-white">
          <Save className="w-3 h-3 mr-1" /> {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button onClick={onClose} variant="ghost" className="glass">Skip</Button>
      </div>
    </div>
  );
}