import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, BarChart3, ExternalLink, Check } from 'lucide-react';
import { formatCurrency, formatPercent, convertCurrency } from '@/lib/format';
import getAssetIcon from '@/components/finance/getAssetIcon';
import TradingViewWidget from '@/components/finance/TradingViewWidget';

export default function EditAssetModal({ holding, displayCurrency, exchangeRate, onClose, onUpdate, onDelete }) {
  const [editQty, setEditQty] = useState(holding.quantity?.toString() || '');
  const [editPrice, setEditPrice] = useState(holding.buy_price?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [showChart, setShowChart] = useState(false);

  const h = holding;
  const holdingCurrency = h.currency || 'USD';
  const icon = h.logo_url || getAssetIcon(h.symbol, h.asset_type);

  const previewValue = (Number(editQty) || 0) * (h.current_price || h.buy_price || 0);
  const previewCost = (Number(editQty) || 0) * (Number(editPrice) || h.buy_price || 0);
  const previewChange = previewCost > 0 ? ((previewValue - previewCost) / previewCost) * 100 : 0;
  const displayPreviewValue = convertCurrency(previewValue, holdingCurrency, displayCurrency, exchangeRate);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Holding.update(h.id, {
        quantity: Number(editQty) || 0,
        buy_price: Number(editPrice) || 0,
      });
      onUpdate(updated);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const tvLink = `https://www.tradingview.com/symbols/${h.asset_type === 'crypto' ? h.symbol + 'USDT' : h.symbol}/`;

  return (
    <Dialog open={!!holding} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-copper/10 shrink-0">
              {icon ? (
                <img src={icon} alt={h.symbol} className="w-7 h-7 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <span className="text-xs font-bold uppercase">{h.symbol?.slice(0, 3)}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>{h.symbol}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">{h.asset_type}</span>
              </div>
              <p className="text-xs text-muted-foreground font-normal">{h.name}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-1">
          <div className="glass rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Position Value</span>
              <span className={`text-xs font-semibold ${previewChange >= 0 ? 'text-sage' : 'text-rose-400'}`}>
                {formatPercent(previewChange)}
              </span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(displayPreviewValue, false, displayCurrency)}</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
              <Input type="number" step="any" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="bg-muted border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Avg Buy Price ({holdingCurrency})</label>
              <Input type="number" step="any" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="bg-muted border-border" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1 bg-copper hover:bg-copper/90 text-copper-foreground">
              <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={() => setShowChart(!showChart)} variant="outline" className="glass border-border">
              <BarChart3 className="w-4 h-4" />
            </Button>
            <a href={tvLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-9 w-9 rounded-md glass border-border">
              <ExternalLink className="w-4 h-4" />
            </a>
            <Button onClick={onDelete} variant="outline" className="glass border-border text-rose-400">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {showChart && (
            <div className="rounded-xl overflow-hidden border border-border">
              <TradingViewWidget symbol={h.symbol} type={h.asset_type} exchange={h.exchange} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}