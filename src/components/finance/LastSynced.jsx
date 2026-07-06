import { useState, useEffect } from 'react';

export default function LastSynced({ timestamp }) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!timestamp) return null;

  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

  let text;
  if (diff < 60) text = `${diff}s ago`;
  else if (diff < 3600) text = `${Math.floor(diff / 60)}m ago`;
  else text = `${Math.floor(diff / 3600)}h ago`;

  return (
    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
      Synced {text}
    </span>
  );
}