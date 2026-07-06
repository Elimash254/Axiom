export default function StatCard({ label, value, sublabel, color = '#ffffff', icon: Icon, onClick }) {
    return (
      <div
        onClick={onClick}
        className={`glass rounded-2xl p-4 ${onClick ? 'cursor-pointer hover:bg-white/5 transition-all' : ''}`}
      >
        <div className="flex items-center gap-2 mb-2">
          {Icon && <Icon className="w-4 h-4" style={{ color }} />}
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        {sublabel && <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>}
      </div>
    );
  }