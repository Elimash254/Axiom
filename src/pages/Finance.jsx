import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModuleHeader from '@/components/ModuleHeader';
import EmptyState from '@/components/EmptyState';
import { formatCurrency, formatPercent, todayStr, convertCurrency } from '@/lib/format';
import AccountCard from '@/components/finance/AccountCard';
import SavingsCard from '@/components/finance/SavingsCard';
import HoldingCard from '@/components/finance/HoldingCard';
import AssetSearch from '@/components/finance/AssetSearch';
import CurrencyToggle from '@/components/finance/CurrencyToggle';
import getAssetIcon from '@/components/finance/getAssetIcon';
import { fetchCryptoPrices, fetchAssetPrice, fetchUsdKesRate } from '@/lib/priceService';
import LastSynced from '@/components/finance/LastSynced';
import PullToRefresh from '@/components/PullToRefresh';
import toast from 'react-hot-toast';

const txnCategories = ['income', 'rent', 'food', 'transport', 'investment', 'entertainment', 'health', 'education', 'shopping', 'other'];

export default function Finance() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(null);

  // Invest states
  const [displayCurrency, setDisplayCurrency] = useState('KES');
  const [exchangeRate, setExchangeRate] = useState(() => parseFloat(localStorage.getItem('usd_kes_rate')) || 130);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [livePrice, setLivePrice] = useState(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [holdingQty, setHoldingQty] = useState('');
  const [holdingBuyPrice, setHoldingBuyPrice] = useState('');
  const [liveLogo, setLiveLogo] = useState(null);
  const [investSubTab, setInvestSubTab] = useState('crypto');
  const [activeTab, setActiveTab] = useState('cash');

  // Form states
  const [newAccount, setNewAccount] = useState({ name: '', type: 'bank', balance: 0 });
  const [newTxn, setNewTxn] = useState({ description: '', amount: 0, type: 'expense', category: 'food', date: todayStr() });
  const [newSavings, setNewSavings] = useState({ title: '', target_amount: 0, current_amount: 0, target_date: '' });

  useEffect(() => {loadData();fetchExchangeRate();}, []);

  const loadData = async () => {
    try {
      const [a, t, h, sg] = await Promise.all([
      base44.entities.Account.list(),
      base44.entities.Transaction.list('-date', 100),
      base44.entities.Holding.list(),
      base44.entities.SavingsGoal.list()]
      );
      setAccounts(a);
      setTransactions(t);
      
      // Sanitize holdings data to prevent NaN errors
      const sanitizedHoldings = h.map(holding => ({
        ...holding,
        quantity: Number(holding.quantity) || 0,
        buy_price: Number(holding.buy_price) || 0,
        current_price: Number(holding.current_price) || Number(holding.buy_price) || 0,
      }));
      console.log('[Finance] Loaded and sanitized holdings:', sanitizedHoldings.length);
      setHoldings(sanitizedHoldings);
      
      setSavingsGoals(sg);
      if (sanitizedHoldings.length > 0) refreshPrices(sanitizedHoldings);
    } catch (err) {console.error(err);} finally
    {setLoading(false);}
  };

  const fetchExchangeRate = async () => {
    const rate = await fetchUsdKesRate();
    if (rate > 1) setExchangeRate(rate);
  };

  const handleAssetSelect = async (asset) => {
    setSelectedAsset(asset);
    setLivePrice(null);
    setLiveLogo(null);
    setHoldingQty('');
    setHoldingBuyPrice('');
    setFetchingPrice(true);
    try {
      const { price, logo } = await fetchAssetPrice(asset);
      setLivePrice(price);
      setLiveLogo(logo);
      setHoldingBuyPrice(price?.toString() || '');
    } catch {}
    setFetchingPrice(false);
  };

  const addHolding = async () => {
    if (!selectedAsset || !holdingQty) return;
    try {
      console.log('[Finance] Adding holding:', selectedAsset.symbol, 'qty:', holdingQty, 'price:', holdingBuyPrice);
      console.log('[Finance] Selected asset details:', JSON.stringify(selectedAsset, null, 2));
      console.log('[Finance] Current investSubTab before add:', investSubTab);
      
      // Force asset_type to match current investSubTab
      const assetType = investSubTab;
      console.log('[Finance] FORCING asset_type to:', assetType);
      
      const created = await base44.entities.Holding.create({
        symbol: selectedAsset.symbol,
        name: selectedAsset.name,
        asset_type: assetType,
        currency: selectedAsset.currency,
        exchange: selectedAsset.exchange,
        quantity: Number(holdingQty),
        buy_price: Number(holdingBuyPrice) || livePrice || 0,
        current_price: livePrice || 0,
        logo_url: liveLogo || null,
        last_updated: new Date().toISOString()
      });
      console.log('[Finance] Holding created successfully:', created);
      console.log('[Finance] Created holding asset_type:', created.asset_type);
      
      // Sanitize the created holding to prevent NaN errors
      const sanitizedHolding = {
        ...created,
        quantity: Number(created.quantity) || 0,
        buy_price: Number(created.buy_price) || 0,
        current_price: Number(created.current_price) || Number(created.buy_price) || 0,
        asset_type: assetType, // Force the asset_type to match investSubTab
      };
      
      console.log('[Finance] Sanitized holding asset_type:', sanitizedHolding.asset_type);
      
      setHoldings(prev => {
        console.log('[Finance] Adding to holdings. Current count:', prev.length, 'New holding:', sanitizedHolding);
        const newHoldings = [...prev, sanitizedHolding];
        console.log('[Finance] New holdings count:', newHoldings.length);
        console.log('[Finance] All holdings asset_types:', newHoldings.map(h => ({ id: h.id, symbol: h.symbol, asset_type: h.asset_type })));
        console.log('[Finance] Holdings filtered by', investSubTab, ':', newHoldings.filter(h => h.asset_type === investSubTab));
        return newHoldings;
      });
      
      setSelectedAsset(null);
      setLivePrice(null);
      setLiveLogo(null);
      setHoldingQty('');
      setHoldingBuyPrice('');
      setShowAdd(null);
      
    } catch (err) {
      console.error('[Finance] Error adding holding:', err);
      toast.error('Failed to add holding');
    }
  };

  const refreshPrices = async (holdingsParam) => {
    setRefreshing(true);
    const source = Array.isArray(holdingsParam) ? holdingsParam : holdings;
    const cryptoSyms = source.filter((h) => h.asset_type === 'crypto').map((h) => h.symbol);
    const cryptoData = cryptoSyms.length > 0 ? await fetchCryptoPrices(cryptoSyms) : {};

    const updated = [...source];
    for (let h of updated) {
      try {
        let price, logo, sparkline;
        if (h.asset_type === 'crypto' && cryptoData[h.symbol]) {
          price = cryptoData[h.symbol].price;
          logo = cryptoData[h.symbol].logo;
          sparkline = cryptoData[h.symbol].sparkline;
        } else {
          const result = await fetchAssetPrice(h);
          price = result.price;
          logo = result.logo;
          sparkline = result.sparkline;
        }
        if (price) {
          h.current_price = price;
          h.last_updated = new Date().toISOString();
          if (logo) h.logo_url = logo;
          if (sparkline) h.sparkline = sparkline;
          try {await base44.entities.Holding.update(h.id, { current_price: h.current_price, last_updated: h.last_updated, logo_url: h.logo_url });} catch {}
        }
      } catch {}
    }
    setHoldings([...updated]);
    setRefreshing(false);
  };

  // Auto-refresh prices every 60 seconds
  useEffect(() => {
    if (holdings.length === 0) return;
    const interval = setInterval(() => refreshPrices(), 60000);
    return () => clearInterval(interval);
  }, [holdings.length]);

  const addAccount = async () => {
    if (!newAccount.name.trim()) return;
    const tempId = 'temp-' + Date.now();
    const tempAccount = { ...newAccount, id: tempId };
    setAccounts(prev => [...prev, tempAccount]);
    setNewAccount({ name: '', type: 'bank', balance: 0 });
    setShowAdd(null);
    try {
      const created = await base44.entities.Account.create(newAccount);
      setAccounts(prev => prev.map(a => a.id === tempId ? created : a));
    } catch (err) {
      toast.error('Something went wrong, please try again');
      setAccounts(prev => prev.filter(a => a.id !== tempId));
    }
  };

  const addTxn = async () => {
    if (!newTxn.description.trim() || !newTxn.amount) return;
    const tempId = 'temp-' + Date.now();
    const tempTxn = { ...newTxn, id: tempId, amount: Number(newTxn.amount) };
    setTransactions(prev => [tempTxn, ...prev]);
    setNewTxn({ description: '', amount: 0, type: 'expense', category: 'food', date: todayStr() });
    setShowAdd(null);
    try {
      const created = await base44.entities.Transaction.create({ ...newTxn, amount: Number(newTxn.amount) });
      setTransactions(prev => prev.map(t => t.id === tempId ? created : t));
    } catch (err) {
      toast.error('Something went wrong, please try again');
      setTransactions(prev => prev.filter(t => t.id !== tempId));
    }
  };

  const addSavings = async () => {
    if (!newSavings.title.trim() || !newSavings.target_amount) return;
    const tempId = 'temp-' + Date.now();
    const tempSavings = { ...newSavings, id: tempId, target_amount: Number(newSavings.target_amount), current_amount: Number(newSavings.current_amount) };
    setSavingsGoals(prev => [...prev, tempSavings]);
    setNewSavings({ title: '', target_amount: 0, current_amount: 0, target_date: '' });
    setShowAdd(null);
    try {
      const created = await base44.entities.SavingsGoal.create({
        ...newSavings,
        target_amount: Number(newSavings.target_amount),
        current_amount: Number(newSavings.current_amount)
      });
      setSavingsGoals(prev => prev.map(s => s.id === tempId ? created : s));
    } catch (err) {
      toast.error('Something went wrong, please try again');
      setSavingsGoals(prev => prev.filter(s => s.id !== tempId));
    }
  };

  const deleteItem = async (type, id, setter) => {
    await base44.entities[type].delete(id);
    setter((prev) => prev.filter((item) => item.id !== id));
  };

  // Currency-aware calculations — cash & savings are always KES, convert if showing USD
  const cashTotalRaw = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const cashTotal = convertCurrency(cashTotalRaw, 'KES', displayCurrency, exchangeRate);
  const portfolioValue = holdings.reduce((s, h) => {
    const hc = h.currency || 'USD';
    const quantity = Number(h.quantity) || 0;
    const currentPrice = Number(h.current_price) || Number(h.buy_price) || 0;
    const raw = quantity * currentPrice;
    return s + convertCurrency(raw, hc, displayCurrency, exchangeRate);
  }, 0);
  const portfolioCost = holdings.reduce((s, h) => {
    const hc = h.currency || 'USD';
    const quantity = Number(h.quantity) || 0;
    const buyPrice = Number(h.buy_price) || 0;
    const raw = quantity * buyPrice;
    return s + convertCurrency(raw, hc, displayCurrency, exchangeRate);
  }, 0);
  // Protect against division by zero
  const portfolioChange = portfolioCost > 0 ? (portfolioValue - portfolioCost) / portfolioCost * 100 : 0;
  const savingsTotalRaw = savingsGoals.reduce((s, g) => s + (Number(g.current_amount) || 0), 0);
  const savingsTotal = convertCurrency(savingsTotalRaw, 'KES', displayCurrency, exchangeRate);
  const netWorth = cashTotal + portfolioValue + savingsTotal;

  const monthTxns = transactions.filter((t) => {
    const d = new Date(t.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthIncome = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const monthExpense = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const lastPriceUpdate = holdings.filter((h) => h.last_updated).length > 0 ?
  new Date(Math.max(...holdings.filter((h) => h.last_updated).map((h) => new Date(h.last_updated).getTime()))) :
  null;

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
    <PullToRefresh onRefresh={async () => { await loadData(); await fetchExchangeRate(); }}>
    <div className="px-5 pt-12 pb-8">
      <ModuleHeader
        title="Finance"
        subtitle="Track every shilling"
        accentColor="#C47D57"
        onAdd={() => { setShowAdd(showAdd === 'txn' ? null : 'txn'); setActiveTab('flow'); }}
        addLabel="Log" />
      

      {/* Net Worth Summary */}
      <div className="glass-strong rounded-3xl p-6 mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-copper/5 rounded-full blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Net Worth</p>
            <CurrencyToggle currency={displayCurrency} onToggle={setDisplayCurrency} />
          </div>
          <span className="text-4xl font-bold tracking-tight">{formatCurrency(netWorth, false, displayCurrency)}</span>
          <div className="flex items-center gap-4 mt-4">
            <div><p className="text-xs text-muted-foreground uppercase">Cash</p><p className="text-sm font-semibold">{formatCurrency(cashTotal, true, displayCurrency)}</p></div>
            <div className="w-px h-8 bg-white/10"></div>
            <div><p className="text-xs text-muted-foreground uppercase">Portfolio</p><p className="text-sm font-semibold">{formatCurrency(portfolioValue, true, displayCurrency)}</p></div>
            <div className="w-px h-8 bg-white/10"></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Change</p>
              <p className={`text-sm font-semibold ${portfolioChange >= 0 ? 'text-sage' : 'text-rose-400'}`}>{formatPercent(portfolioChange)}</p>
            </div>
          </div>
          {exchangeRate > 1 &&
          <p className="text-xs text-muted-foreground mt-3">1 USD ≈ Ksh {exchangeRate.toFixed(2)}</p>
          }
        </div>
      </div>

      {/* Monthly Cash Flow */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-sage" /><span className="text-xs text-muted-foreground uppercase">Income (Mo)</span></div>
          <p className="text-xl font-bold text-sage">{formatCurrency(convertCurrency(monthIncome, 'KES', displayCurrency, exchangeRate), true, displayCurrency)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-rose-400" /><span className="text-xs text-muted-foreground uppercase">Expenses (Mo)</span></div>
          <p className="text-xl font-bold text-rose-400">{formatCurrency(convertCurrency(monthExpense, 'KES', displayCurrency, exchangeRate), true, displayCurrency)}</p>
        </div>
      </div>

      {/* Wealth Growth */}
      <div className="glass rounded-2xl p-4 mb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sage/15 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-sage" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase font-medium">Wealth Growth</p>
          <p className="text-sm font-semibold text-sage">
            {formatCurrency(portfolioValue - portfolioCost + savingsTotal, true, displayCurrency)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground text-right max-w-[100px]">Investment gains + total savings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/5 mb-4 h-10">
          <TabsTrigger value="cash" className="text-xs">Cash</TabsTrigger>
          <TabsTrigger value="flow" className="text-xs">Flow</TabsTrigger>
          <TabsTrigger value="savings" className="text-xs">Savings</TabsTrigger>
          <TabsTrigger value="invest" className="text-xs">Invest</TabsTrigger>
        </TabsList>

        {/* Cash & Bank Accounts */}
        <TabsContent value="cash" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Accounts</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(showAdd === 'account' ? null : 'account')} className="text-copper text-xs"><Plus className="w-3 h-3" /> Add</Button>
          </div>
          {showAdd === 'account' &&
          <div className="glass-strong rounded-2xl p-4 space-y-2">
              <Input placeholder="Account name" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} className="bg-white/5 border-white/10" />
              <div className="flex gap-2">
                {['cash', 'bank', 'savings', 'credit'].map((t) =>
              <button key={t} onClick={() => setNewAccount({ ...newAccount, type: t })} className={`px-3 py-1.5 rounded-lg text-xs ${newAccount.type === t ? 'bg-copper text-background' : 'glass text-muted-foreground'}`}>{t}</button>
              )}
              </div>
              <Input type="number" placeholder="Balance" value={newAccount.balance} onChange={(e) => setNewAccount({ ...newAccount, balance: Number(e.target.value) })} className="bg-white/5 border-white/10" />
              <Button onClick={addAccount} className="w-full bg-copper hover:bg-copper/90 text-background">Add Account</Button>
            </div>
          }
          {accounts.length === 0 ?
          <EmptyState title="No accounts" subtitle="Add your bank, cash, and savings accounts to track your cash position." /> :

          accounts.map((acc) =>
          <AccountCard
            key={acc.id}
            account={acc}
            onDelete={() => deleteItem('Account', acc.id, setAccounts)}
            onTxn={(txn, updatedAccount) => {
              setTransactions(prev => [txn, ...prev]);
              setAccounts(prev => prev.map((a) => a.id === updatedAccount.id ? updatedAccount : a));
            }} />

          )
          }
        </TabsContent>

        {/* Transactions / Cash Flow */}
        <TabsContent value="flow" className="space-y-3">
          {showAdd === 'txn' &&
          <div className="glass-strong rounded-2xl p-4 space-y-2">
              <Input placeholder="Description" value={newTxn.description} onChange={(e) => setNewTxn({ ...newTxn, description: e.target.value })} className="bg-white/5 border-white/10" />
              <Input type="number" placeholder="Amount" value={newTxn.amount} onChange={(e) => setNewTxn({ ...newTxn, amount: e.target.value })} className="bg-white/5 border-white/10" />
              <div className="flex gap-2">
                {['income', 'expense', 'investment'].map((t) =>
              <button key={t} onClick={() => setNewTxn({ ...newTxn, type: t, category: t === 'income' ? 'income' : t === 'expense' ? 'food' : 'investment' })} className={`px-3 py-1.5 rounded-lg text-xs ${newTxn.type === t ? 'bg-copper text-background' : 'glass text-muted-foreground'}`}>{t}</button>
              )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {txnCategories.map((c) =>
              <button key={c} onClick={() => setNewTxn({ ...newTxn, category: c })} className={`px-2 py-1 rounded-lg text-xs ${newTxn.category === c ? 'bg-copper/30 text-copper' : 'glass text-muted-foreground'}`}>{c}</button>
              )}
              </div>
              <Input type="date" value={newTxn.date} onChange={(e) => setNewTxn({ ...newTxn, date: e.target.value })} className="bg-white/5 border-white/10" />
              <Button onClick={addTxn} className="w-full bg-copper hover:bg-copper/90 text-background">Log Transaction</Button>
            </div>
          }
          {transactions.length === 0 ?
          <EmptyState title="No transactions" subtitle="Log your income and expenses to see your cash flow patterns." /> :

          transactions.slice(0, 30).map((txn) =>
          <div key={txn.id} className="glass rounded-xl p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${txn.type === 'income' ? 'bg-sage/15' : 'bg-rose-500/15'}`}>
                  {txn.type === 'income' ? <TrendingUp className="w-4 h-4 text-sage" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{txn.description}</p>
                  <p className="text-xs text-muted-foreground">{txn.category} · {txn.date}</p>
                </div>
                <p className={`font-semibold text-sm ${txn.type === 'income' ? 'text-sage' : 'text-rose-400'}`}>
                   {txn.type === 'income' ? '+' : '-'}{formatCurrency(convertCurrency(txn.amount, 'KES', displayCurrency, exchangeRate), false, displayCurrency)}
                 </p>
              </div>
          )
          }
        </TabsContent>

        {/* Savings Goals */}
        <TabsContent value="savings" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Savings Goals</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(showAdd === 'savings' ? null : 'savings')} className="text-copper text-xs"><Plus className="w-3 h-3" /> Add</Button>
          </div>
          {showAdd === 'savings' &&
          <div className="glass-strong rounded-2xl p-4 space-y-2">
              <Input placeholder="Goal title (e.g. Emergency Fund)" value={newSavings.title} onChange={(e) => setNewSavings({ ...newSavings, title: e.target.value })} className="bg-white/5 border-white/10" />
              <Input type="number" placeholder="Target amount" value={newSavings.target_amount} onChange={(e) => setNewSavings({ ...newSavings, target_amount: e.target.value })} className="bg-white/5 border-white/10" />
              <Input type="number" placeholder="Current amount" value={newSavings.current_amount} onChange={(e) => setNewSavings({ ...newSavings, current_amount: e.target.value })} className="bg-white/5 border-white/10" />
              <Input type="date" value={newSavings.target_date} onChange={(e) => setNewSavings({ ...newSavings, target_date: e.target.value })} className="bg-white/5 border-white/10" />
              <Button onClick={addSavings} className="w-full bg-copper hover:bg-copper/90 text-background">Add Goal</Button>
            </div>
          }
          {savingsGoals.length === 0 ?
          <EmptyState title="No savings goals" subtitle="Set a target — emergency fund, vacation, big purchase." /> :

          savingsGoals.map((sg) =>
          <SavingsCard
            key={sg.id}
            goal={sg}
            onDelete={() => deleteItem('SavingsGoal', sg.id, setSavingsGoals)}
            onUpdate={(updated) => setSavingsGoals(prev => prev.map((s) => s.id === updated.id ? updated : s))} />

          )
          }
        </TabsContent>

        {/* Investments */}
        <TabsContent value="invest" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-muted-foreground uppercase text-xs shrink-0">PORTFOLIO</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <CurrencyToggle currency={displayCurrency} onToggle={setDisplayCurrency} />
              <Button size="icon" variant="ghost" onClick={refreshPrices} disabled={refreshing} className="text-copper h-8 w-8 shrink-0" aria-label="Refresh prices">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button size="sm" onClick={() => {setShowAdd(showAdd === 'holding' ? null : 'holding');setSelectedAsset(null);setLivePrice(null);}} className="bg-copper hover:bg-copper/90 text-copper-foreground px-2.5 h-8 text-xs shrink-0"><Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Asset</span></Button>
            </div>
          </div>

          {/* Portfolio Summary */}
          {holdings.length > 0 &&
          <div className="glass-strong rounded-2xl p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Portfolio Value</span>
                <LastSynced timestamp={lastPriceUpdate?.toISOString()} />
              </div>
              <p className="text-3xl font-bold tracking-tight">{formatCurrency(portfolioValue, false, displayCurrency)}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-sm font-semibold ${portfolioChange >= 0 ? 'text-sage' : 'text-rose-400'}`}>
                  {formatPercent(portfolioChange)}
                </span>
                <span className={`text-xs ${portfolioChange >= 0 ? 'text-sage' : 'text-rose-400'}`}>
                  {portfolioChange >= 0 ? '+' : ''}{formatCurrency(portfolioValue - portfolioCost, true, displayCurrency)}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs">
                <span className="text-muted-foreground">Cost: {formatCurrency(portfolioCost, true, displayCurrency)}</span>
                <span className="text-muted-foreground ml-auto">{holdings.filter((h) => h.asset_type === 'crypto').length} crypto · {holdings.filter((h) => h.asset_type === 'stock').length} stocks</span>
              </div>
            </div>
          }

          {/* Sub-tabs: Crypto / Stocks */}
          <div className="flex gap-0.5 glass rounded-lg p-0.5">
            <button onClick={() => setInvestSubTab('crypto')} className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${investSubTab === 'crypto' ? 'bg-copper text-background' : 'text-muted-foreground'}`}>Crypto</button>
            <button onClick={() => setInvestSubTab('stock')} className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${investSubTab === 'stock' ? 'bg-copper text-background' : 'text-muted-foreground'}`}>Stocks</button>
          </div>

          {/* Add Holding with AssetSearch */}
          {showAdd === 'holding' &&
          <div className="glass-strong rounded-2xl p-4 space-y-3">
              {!selectedAsset ?
            <div>
                  <p className="text-xs text-muted-foreground mb-2">Search for a {investSubTab === 'crypto' ? 'cryptocurrency' : 'stock'} to add:</p>
                  <AssetSearch onSelect={handleAssetSelect} filterType={investSubTab} />
                </div> :

            <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {(() => {
                  const icon = liveLogo || getAssetIcon(selectedAsset.symbol, selectedAsset.asset_type);
                  return (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${selectedAsset.asset_type === 'crypto' ? 'bg-copper/15' : 'bg-copper/15'}`}>
                          {icon ?
                      <img src={icon} alt={selectedAsset.symbol} className="w-7 h-7 object-contain" onError={(e) => {e.target.style.display = 'none';}} /> :

                      <span className="text-xs font-bold uppercase">{selectedAsset.symbol.slice(0, 3)}</span>
                      }
                        </div>);

                })()}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{selectedAsset.symbol}</p>
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-white/5 text-muted-foreground uppercase">{selectedAsset.asset_type}</span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-white/5 text-muted-foreground">{selectedAsset.currency}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{selectedAsset.name}</p>
                    </div>
                    <button onClick={() => {setSelectedAsset(null);setLivePrice(null);}} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
                  </div>

                  {fetchingPrice ?
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> Fetching live price...
                    </div> :
              livePrice ?
              <div className="glass rounded-xl p-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Live Price</span>
                      <span className="font-bold text-sm">{formatCurrency(livePrice, false, selectedAsset.currency)}</span>
                    </div> :
              null}

                  <Input type="number" step="any" placeholder="Quantity" value={holdingQty} onChange={(e) => setHoldingQty(e.target.value)} className="bg-white/5 border-white/10" />
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Buy Price (in {selectedAsset.currency})</label>
                    <Input type="number" step="any" placeholder="Avg buy price" value={holdingBuyPrice} onChange={(e) => setHoldingBuyPrice(e.target.value)} className="bg-white/5 border-white/10" />
                  </div>

                  {holdingQty && (livePrice || holdingBuyPrice) &&
              <div className="glass rounded-xl p-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Position Value</span>
                      <span className="font-bold text-sm">{formatCurrency(Number(holdingQty) * Number(holdingBuyPrice || livePrice || 0), false, selectedAsset.currency)}</span>
                    </div>
              }

                  <Button onClick={addHolding} className="w-full bg-copper hover:bg-copper/90 text-background">Add Holding</Button>
                </div>
            }
            </div>
          }

          {holdings.filter((h) => h.asset_type === investSubTab).length === 0 && showAdd !== 'holding' ?
          <EmptyState title={investSubTab === 'crypto' ? 'No crypto holdings' : 'No stock holdings'} subtitle={`Search for ${investSubTab === 'crypto' ? 'cryptocurrencies' : 'stocks'} to add to your portfolio. Live prices update automatically.`} /> :

          holdings.filter((h) => h.asset_type === investSubTab).map((h) =>
          <HoldingCard
            key={h.id}
            holding={h}
            onDelete={() => deleteItem('Holding', h.id, setHoldings)}
            onUpdate={(updated) => setHoldings((prev) => prev.map((x) => x.id === updated.id ? updated : x))}
            displayCurrency={displayCurrency}
            exchangeRate={exchangeRate}
            sparkline={h.sparkline} />

          )
          }
        </TabsContent>
      </Tabs>
      </div>
      </PullToRefresh>
      </motion.div>
      );
      }