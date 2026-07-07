import { useState } from 'react';
import { formatCurrency, formatPercent, convertCurrency } from '@/lib/format';
import getAssetIcon from '@/components/finance/getAssetIcon';
import Sparkline from '@/components/finance/Sparkline';
import EditAssetModal from '@/components/finance/EditAssetModal';

export default function HoldingCard({ holding, onDelete, onUpdate, displayCurrency = 'KES', exchangeRate = 1, sparkline }) {
  const [modalOpen, setModalOpen] = useState(false);

  const h = holding;
  const holdingCurrency = h.currency || 'USD';
  const quantity = Number(h.quantity) || 0;
  const currentPrice = Number(h.current_price) || Number(h.buy_price) || 0;
  const buyPrice = Number(h.buy_price) || 0;
  const rawValue = quantity * currentPrice;
  const rawCost = quantity * buyPrice;
  const value = convertCurrency(rawValue, holdingCurrency, displayCurrency, exchangeRate);
  const change = rawCost > 0 ? ((rawValue - rawCost) / rawCost) * 100 : 0;
  const icon = h.logo_url || getAssetIcon(h.symbol, h.asset_type);
  const sparkColor = change >= 0 ? '#7E9D8A' : '#C8624F';

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="w-full text-left glass rounded-2xl p-4 hover:bg-white/[0.02] transition-colors no-tap-highlight"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-copper/10 shrink-0">
            {icon ? (
              <img src={icon} alt={h.symbol} className="w-7 h-7 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <span className="text-xs font-bold uppercase">{h.symbol?.slice(0, 3)}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm">{h.symbol}</p>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">{h.asset_type}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{h.quantity} {h.symbol}</p>
          </div>

          {sparkline && sparkline.length > 2 && (
            <Sparkline data={sparkline} color={sparkColor} width={56} height={24} />
          )}

          <div className="text-right shrink-0">
            <p className="font-bold text-sm">{formatCurrency(value, true, displayCurrency)}</p>
            <p className={`text-xs font-semibold ${change >= 0 ? 'text-sage' : 'text-rose-400'}`}>{formatPercent(change)}</p>
          </div>
        </div>
      </button>

      {modalOpen && (
        <EditAssetModal
          holding={holding}
          displayCurrency={displayCurrency}
          exchangeRate={exchangeRate}
          onClose={() => setModalOpen(false)}
          onUpdate={onUpdate}
          onDelete={() => { onDelete(); setModalOpen(false); }}
        />
      )}
    </>
  );
}