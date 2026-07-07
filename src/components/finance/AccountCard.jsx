import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Wallet, Trash2, Plus, Minus, X } from 'lucide-react';
import { formatCurrency, todayStr } from '@/lib/format';

export default function AccountCard({ account, onDelete, onTxn }) {
  const [showForm, setShowForm] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt) return;
    const isAdd = showForm === 'add';
    const txnType = isAdd ? 'income' : 'expense';
    const txn = await base44.entities.Transaction.create({
      description: description || (isAdd ? 'Deposit' : 'Withdrawal'),
      amount: amt,
      type: txnType,
      category: isAdd ? 'income' : 'other',
      date: todayStr(),
      account_id: account.id,
    });
    const currentBalance = Number(account.balance) || 0;
    const newBalance = currentBalance + (isAdd ? amt : -amt);
    const updated = await base44.entities.Account.update(account.id, { balance: newBalance });
    onTxn(txn, updated);
    setAmount('');
    setDescription('');
    setShowForm(null);
  };

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-copper/15 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-copper" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">{account.name}</p>
          <p className="text-xs text-muted-foreground uppercase">{account.type}</p>
        </div>
        <p className="font-bold">{formatCurrency(account.balance)}</p>
        <button onClick={onDelete} className="text-muted-foreground hover:text-rose-400 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
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
        <div className="mt-3 space-y-2">
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="number"
            placeholder="Amount (Ksh)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className={`flex-1 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold ${showForm === 'add' ? 'bg-sage text-background' : 'bg-rose-500 text-background'}`}
            >
              Confirm {showForm === 'add' ? 'Deposit' : 'Withdrawal'}
            </button>
            <button onClick={() => setShowForm(null)} className="px-3 py-1.5 min-h-[44px] rounded-lg text-xs glass" aria-label="Close">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}