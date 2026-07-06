import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ModuleHeader({ title, subtitle, accentColor, onAdd, addLabel }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accentColor }} />
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        {subtitle && <p className="text-sm text-muted-foreground ml-3">{subtitle}</p>}
      </div>
      {onAdd && (
        <Button
          onClick={onAdd}
          size="sm"
          className="rounded-xl gap-1"
          style={{ backgroundColor: accentColor, color: '#1A1A17' }}
        >
          <Plus className="w-4 h-4" />
          {addLabel || 'Add'}
        </Button>
      )}
    </div>
  );
}