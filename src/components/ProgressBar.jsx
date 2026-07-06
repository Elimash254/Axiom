export default function ProgressBar({ value, max, color = '#3b82f6', height = 8 }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  
    return (
      <div className="w-full rounded-full overflow-hidden" style={{ height, backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
    );
  }