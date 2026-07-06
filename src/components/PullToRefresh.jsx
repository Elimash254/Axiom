import { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const threshold = 72;

  const handleTouchStart = (e) => { startY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => {
    const dist = e.touches[0].clientY - startY.current;
    if (dist > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(dist, threshold * 1.5));
      if (dist > 5) e.preventDefault();
    }
  };
  const handleTouchEnd = async () => {
    if (pullDistance >= threshold) {
      setPulling(true);
      try { await onRefresh(); } catch (e) { /* silent */ }
      setPulling(false);
    }
    setPullDistance(0);
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ touchAction: 'pan-y' }}>
      {(pullDistance > 0 || pulling) && (
        <div className="flex items-center justify-center py-3" style={{ height: Math.min(pullDistance, threshold) }}>
          <RefreshCw className={`w-5 h-5 text-copper ${pulling ? 'animate-spin' : ''}`} style={{ transform: `rotate(${(pullDistance / threshold) * 360}deg)` }} />
        </div>
      )}
      {children}
    </div>
  );
}