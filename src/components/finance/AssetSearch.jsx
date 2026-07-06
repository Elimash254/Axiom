import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { ALL_ASSETS } from '@/lib/assetData';
import getAssetIcon from '@/components/finance/getAssetIcon';

export default function AssetSearch({ onSelect, filterType }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const pool = useMemo(() => {
    if (filterType) return ALL_ASSETS.filter(a => a.asset_type === filterType);
    return ALL_ASSETS;
  }, [filterType]);

  const results = useMemo(() => {
    if (!query.trim()) return pool.slice(0, 8);
    const q = query.toUpperCase();
    return pool.filter(a =>
      a.symbol.includes(q) || a.name.toUpperCase().includes(q)
    ).slice(0, 12);
  }, [query, pool]);

  const handleSelect = (asset) => {
    onSelect(asset);
    setQuery('');
    setFocused(false);
  };

  const placeholder = filterType === 'crypto'
    ? 'Search crypto (BTC, TOSHI, HBAR)...'
    : filterType === 'stock'
    ? 'Search stocks (SCOM, AAPL, FTGH)...'
    : 'Search assets (BTC, SCOM, AAPL)...';

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      {focused && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 glass-strong rounded-xl border border-white/10 max-h-72 overflow-y-auto z-50">
          {results.map(asset => {
            const icon = getAssetIcon(asset.symbol, asset.asset_type);
            return (
              <button
                key={asset.symbol + asset.exchange}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(asset); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-copper/10 shrink-0">
                  {icon ? (
                    <img src={icon} alt={asset.symbol} className="w-5 h-5 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <span className="text-[10px] font-bold uppercase">{asset.symbol.slice(0, 3)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{asset.symbol}</p>
                  <p className="text-xs text-muted-foreground truncate">{asset.name}</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-muted-foreground">{asset.exchange}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-muted-foreground">{asset.currency}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}