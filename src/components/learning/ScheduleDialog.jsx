import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, Calendar as CalIcon, Check, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { todayStr } from '@/lib/format';

export default function ScheduleDialog({ topic, courseTitle, onClose }) {
  const [date, setDate] = useState(topic.scheduled_date || todayStr());
  const [time, setTime] = useState(topic.scheduled_time || '09:00');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      // Create or update calendar event
      if (topic.calendar_event_id) {
        await base44.entities.CalendarEvent.update(topic.calendar_event_id, {
          title: `${topic.title}`,
          description: `Study: ${courseTitle}`,
          date,
          time,
          category: 'academic',
        });
      } else {
        const event = await base44.entities.CalendarEvent.create({
          title: topic.title,
          description: `Study: ${courseTitle}`,
          date,
          time,
          category: 'academic',
          color: '#3b82f6',
        });

        // Also create an alarm for the study session
        await base44.entities.Alarm.create({
          title: `Study: ${topic.title}`,
          time,
          days: 'everyday',
          enabled: true,
          sound: true,
          color: '#3b82f6',
        });

        // Link event to topic
        await base44.entities.Topic.update(topic.id, {
          scheduled_date: date,
          scheduled_time: time,
          calendar_event_id: event.id,
        });
      }
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const unschedule = async () => {
    setSaving(true);
    try {
      if (topic.calendar_event_id) {
        await base44.entities.CalendarEvent.delete(topic.calendar_event_id);
      }
      await base44.entities.Topic.update(topic.id, {
        scheduled_date: null,
        scheduled_time: null,
        calendar_event_id: null,
      });
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
        <CalIcon className="w-4 h-4 text-blue-400" />
        <p className="text-sm font-medium">Schedule Study Session</p>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">"{topic.title}"</p>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Date</label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white/5 border-white/10" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Time</label>
        <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-white/5 border-white/10" />
      </div>

      <p className="text-[10px] text-muted-foreground">
        This will create a calendar event and an alarm reminder in your Agenda.
      </p>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
          <Check className="w-3 h-3 mr-1" /> {saving ? 'Saving...' : 'Schedule'}
        </Button>
        {topic.scheduled_date && (
          <Button onClick={unschedule} disabled={saving} variant="ghost" className="glass text-rose-400">
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}