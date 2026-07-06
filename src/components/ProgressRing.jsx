export default function ProgressRing({ progress, size = 64, strokeWidth = 6, color = '#7E9D8A', children }) {
    const segments = 60;
    const activeSegments = Math.round((progress / 100) * segments);
    const center = size / 2;
    const radius = (size - strokeWidth) / 2;
    const segWidth = strokeWidth * 0.5;
    const delta = (Math.PI * 2 / segments) * 0.32;
    const sphereRadius = radius - strokeWidth * 0.5 - 1;
  
    return (
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={center} cy={center} r={radius} fill="#0A0A0A" />
          {Array.from({ length: segments }).map((_, i) => {
            const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
            const x1 = center + Math.cos(angle - delta) * radius;
            const y1 = center + Math.sin(angle - delta) * radius;
            const x2 = center + Math.cos(angle + delta) * radius;
            const y2 = center + Math.sin(angle + delta) * radius;
            const isActive = i < activeSegments;
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isActive ? color : '#5E6759'}
                strokeWidth={segWidth}
                strokeLinecap="round"
                style={{ transition: 'stroke 0.4s ease' }}
              />
            );
          })}
        </svg>
        {/* Center sphere */}
        <div className="absolute rounded-full overflow-hidden" style={{
          width: sphereRadius * 2, height: sphereRadius * 2,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle at 35% 28%, #262626 0%, #161616 45%, #0D0D0D 100%)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.7)',
        }}>
          <div className="absolute rounded-full" style={{
            top: '10%', left: '18%', width: '45%', height: '35%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.06), transparent 70%)',
          }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center" style={{ color, textShadow: `0 0 6px ${color}55` }}>{children}</div>
      </div>
    );
  }