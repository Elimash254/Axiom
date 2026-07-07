export default function ProgressBar({ value, max, color = '#3b82f6', height = 8 }) {
    const numValue = Number(value) || 0;
    const numMax = Number(max) || 0;
    const pct = numMax > 0 ? Math.min(100, Math.max(0, (numValue / numMax) * 100)) : 0;
  
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