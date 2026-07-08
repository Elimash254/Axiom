import { usePrivacyMode } from './PrivacyModeContext';
import { formatCurrency as baseFormatCurrency } from './format';

export function useFormatCurrency() {
  const { hideBalances, togglePrivacyMode } = usePrivacyMode();

  const formatCurrency = (amount, compact = false, currency = 'KES') => {
    if (hideBalances) {
      const cur = currency === 'USD' ? '$' : 'Ksh';
      return compact ? `${cur} •••` : `${cur} ••••••`;
    }
    return baseFormatCurrency(amount, compact, currency);
  };

  return { formatCurrency, hideBalances, togglePrivacyMode };
}
