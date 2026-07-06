export function formatCurrency(amount, compact = false, currency = 'KES') {
    const cur = currency === 'USD' ? 'USD' : 'KES';
    if (amount === null || amount === undefined || isNaN(amount)) return cur === 'USD' ? '$0' : 'Ksh 0';
    if (compact && Math.abs(amount) >= 1000) {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: cur,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(amount);
    }
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  
  export function convertCurrency(amount, fromCurrency, toCurrency, usdKesRate) {
    if (!amount || !usdKesRate) return amount || 0;
    if (fromCurrency === toCurrency) return amount;
    if (fromCurrency === 'USD' && toCurrency === 'KES') return amount * usdKesRate;
    if (fromCurrency === 'KES' && toCurrency === 'USD') return amount / usdKesRate;
    return amount;
  }
  
  export function formatPercent(value) {
    if (value === null || value === undefined || isNaN(value)) return '0%';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }
  
  export function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  export function todayStr() {
    return new Date().toISOString().split('T')[0];
  }
  
  export function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  }
  
  export function getStreakData(logs, habitId) {
    const habitLogs = logs.filter(l => l.habit_id === habitId).map(l => l.date).sort();
    if (habitLogs.length === 0) return { streak: 0, last7: [false, false, false, false, false, false, false] };
  
    const today = new Date();
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      last7.push(habitLogs.includes(dStr));
    }
  
    // Calculate streak from today backwards
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      if (habitLogs.includes(dStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
  
    return { streak, last7 };
  }