import { useEffect, useRef } from 'react';

/**
 * Embeds a TradingView Advanced Real-Time Chart widget.
 *
 * @param {string} symbol   - TradingView symbol (e.g. "SCOM", "BTCUSD", "AAPL")
 * @param {string} type     - "stock" | "crypto"
 * @param {string} exchange - Optional exchange hint (e.g. "NSE", "BINANCE")
 */
export default function TradingViewWidget({ symbol, type, exchange }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any previous widget
    containerRef.current.innerHTML = '';

    // Build the TradingView symbol string
    // Crypto: BINANCE:BTCUSDT  |  NSE stock: NSE:SCOM  |  US stock: NASDAQ:AAPL
    let tvSymbol = symbol;
    if (type === 'crypto') {
      tvSymbol = `${exchange || 'BINANCE'}:${symbol}USDT`;
    } else {
      tvSymbol = `${exchange || 'NSE'}:${symbol}`;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: 'D',
      timezone: 'Africa/Nairobi',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      backgroundColor: '#1A1A17',
      gridColor: 'rgba(255,255,255,0.05)',
    });

    containerRef.current.appendChild(script);
  }, [symbol, type, exchange]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full"
      style={{ height: '400px' }}
    />
  );
}