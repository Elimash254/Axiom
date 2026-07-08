import { COINGECKO_MAP } from '@/lib/assetData';

/**
 * Search CoinGecko for a coin ID by symbol or name.
 * Used as a fallback for crypto symbols not in COINGECKO_MAP.
 */
async function searchCoinGeckoId(symbol) {
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`);
    if (!res.ok) return null;
    const data = await res.json();
    // Try exact symbol match first, then partial
    const exact = data.coins?.find(c => c.symbol.toUpperCase() === symbol.toUpperCase());
    return exact?.id || data.coins?.[0]?.id || null;
  } catch {
    return null;
  }
}

/**
 * Fetch live crypto prices + logos + sparkline from CoinGecko's free API.
 * Supports both known symbols (from COINGECKO_MAP) and unknown symbols (via dynamic search).
 * Returns: { [SYMBOL]: { price: number, logo: string, sparkline: number[] } }
 */
export async function fetchCryptoPrices(symbols) {
  const CACHE_KEY = 'axiom_crypto_cache';
  const CACHE_TIME_KEY = 'axiom_crypto_cache_time';
  const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  // Check cache first
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
  
  if (cachedData && cacheTime) {
    const cacheAge = Date.now() - parseInt(cacheTime);
    if (cacheAge < CACHE_TTL) {
      try {
        const parsed = JSON.parse(cachedData);
        // Return cached data if it contains all requested symbols
        const allSymbolsCached = symbols.every(s => parsed[s]);
        if (allSymbolsCached) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse cached crypto data:', e);
      }
    }
  }

  const knownIds = [];
  const symbolToId = {};
  const unknownSymbols = [];

  for (const s of symbols) {
    if (COINGECKO_MAP[s]) {
      knownIds.push(COINGECKO_MAP[s]);
      symbolToId[COINGECKO_MAP[s]] = s;
    } else {
      unknownSymbols.push(s);
    }
  }

  const result = {};

  // Batch fetch known symbols
  if (knownIds.length > 0) {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${knownIds.join(',')}&sparkline=true&price_change_percentage=24h`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        for (const coin of data) {
          const symbol = symbolToId[coin.id];
          if (symbol) {
            result[symbol] = {
              price: coin.current_price,
              logo: coin.image,
              sparkline: coin.sparkline_in_7d?.price || [],
            };
          }
        }
      } else if (res.status === 429) {
        console.warn('CoinGecko rate limited, falling back to cache');
        // Fall back to cached data on rate limit
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            return parsed;
          } catch (e) {
            console.error('Failed to parse cached crypto data on rate limit:', e);
          }
        }
      }
    } catch (e) {
      console.error('CoinGecko batch fetch failed:', e);
      // Fall back to cached data on error
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          return parsed;
        } catch (e) {
          console.error('Failed to parse cached crypto data on error:', e);
        }
      }
    }
  }

  // Search and fetch unknown symbols in parallel
  if (unknownSymbols.length > 0) {
    const unknownResults = await Promise.all(unknownSymbols.map(async (s) => {
      try {
        const coinId = await searchCoinGeckoId(s);
        if (!coinId) return null;
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&sparkline=true&price_change_percentage=24h`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data[0]) return null;
        return [s, {
          price: data[0].current_price,
          logo: data[0].image,
          sparkline: data[0].sparkline_in_7d?.price || [],
        }];
      } catch {
        return null;
      }
    }));

    for (const r of unknownResults) {
      if (r) result[r[0]] = r[1];
    }
  }

  // Cache the results
  if (Object.keys(result).length > 0) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
      localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    } catch (e) {
      console.error('Failed to cache crypto data:', e);
    }
  }

  // If we got no results but have cached data, fall back to cache
  if (Object.keys(result).length === 0 && cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      return parsed;
    } catch (e) {
      console.error('Failed to parse cached crypto data as fallback:', e);
    }
  }

  return result;
}

/**
 * Fetch a single asset's live price.
 * Uses CoinGecko for crypto (with dynamic search), LLM for stocks.
 */
export async function fetchAssetPrice(asset) {
  if (asset.asset_type === 'crypto') {
    const prices = await fetchCryptoPrices([asset.symbol]);
    if (prices[asset.symbol]) {
      return prices[asset.symbol];
    }
  }

  // Fallback to LLM for stocks and unknown crypto
  const prompt = asset.asset_type === 'crypto'
    ? `What is the current market price of ${asset.symbol} (${asset.name}) cryptocurrency in USD? Return ONLY the numeric price.`
    : asset.currency === 'KES'
    ? `What is the current live trading price of ${asset.symbol} (${asset.name}) on the Nairobi Securities Exchange (NSE Kenya) in Kenyan Shillings (KES)? Return ONLY the numeric price.`
    : `What is the current live market price of ${asset.symbol} (${asset.name}) stock in USD? Return ONLY the numeric price.`;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: { type: 'object', properties: { price: { type: 'number' } } },
  });
  return { price: res.price, logo: null, sparkline: [] };
}

/**
 * Fetch live USD to KES exchange rate from a free API.
 * Caches in localStorage for fallback and instant load.
 */
export async function fetchUsdKesRate() {
  // Try free API first
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data.rates && data.rates.KES) {
      const rate = data.rates.KES;
      localStorage.setItem('usd_kes_rate', rate.toString());
      localStorage.setItem('usd_kes_rate_updated', Date.now().toString());
      return rate;
    }
  } catch (e) {
    console.error('FX API failed:', e);
  }

  // Fallback to cached rate
  const cached = parseFloat(localStorage.getItem('usd_kes_rate'));
  if (cached && cached > 1) return cached;

  // Last resort: LLM
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: 'What is the current USD to KES exchange rate? Return ONLY the numeric rate.',
      add_context_from_internet: true,
      response_json_schema: { type: 'object', properties: { rate: { type: 'number' } } },
    });
    if (res.rate && res.rate > 1) {
      localStorage.setItem('usd_kes_rate', res.rate.toString());
      return res.rate;
    }
  } catch {}

  return 130; // Final fallback
}