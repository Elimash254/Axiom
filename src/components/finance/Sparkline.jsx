export default function Sparkline({ data, color = '#7E9D8A', width = 56, height = 24 }) {
    if (!data || data.length < 2) return null;
  
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
  
    const points = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  
    return (
      <svg width={width} height={height} className="overflow-visible shrink-0">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }