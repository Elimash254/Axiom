import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { PiggyBank, Trash2, Plus, Minus, X } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import ProgressBar from '@/components/ProgressBar';

export default function SavingsCard({ goal, onDelete, onUpdate }) {
  const [showForm, setShowForm] = useState(null);
  const [amount, setAmount] = useState('');

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt) return;
    const isAdd = showForm === 'add';
    const newAmount = isAdd
      ? (goal.current_amount || 0) + amt
      : Math.max(0, (goal.current_amount || 0) - amt);
    const updated = await base44.entities.SavingsGoal.update(goal.id, { current_amount: newAmount });
    onUpdate(updated);
    setAmount('');
    setShowForm(null);
  };

  const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-copper/15 flex items-center justify-center">
          <PiggyBank className="w-5 h-5 text-copper" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">{goal.title}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</p>
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-rose-400 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <ProgressBar value={goal.current_amount} max={goal.target_amount} color="#C47D57" height={8} />
      <p className="text-xs text-muted-foreground mt-1 text-right">{Math.round(pct)}%</p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setShowForm(showForm === 'add' ? null : 'add')}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 min-h-[44px] rounded-lg text-xs glass-strong hover:bg-sage/10 text-emerald-400 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
        <button
          onClick={() => setShowForm(showForm === 'subtract' ? null : 'subtract')}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 min-h-[44px] rounded-lg text-xs glass-strong hover:bg-rose-500/10 text-rose-400 transition-colors"
        >
          <Minus className="w-3 h-3" /> Subtract
        </button>
      </div>
      {showForm && (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            placeholder="Amount (Ksh)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSubmit}
            className={`px-4 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold ${showForm === 'add' ? 'bg-sage text-background' : 'bg-rose-500 text-background'}`}
          >
            Confirm
          </button>
          <button onClick={() => setShowForm(null)} className="px-3 py-1.5 min-h-[44px] rounded-lg text-xs glass" aria-label="Close">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}