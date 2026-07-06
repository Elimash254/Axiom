export default function CurrencyToggle({ currency, onToggle }) {
    return (
      <div className="flex items-center gap-0.5 glass p-0.5 rounded-lg">
        <button
          onClick={() => onToggle('KES')}
          className={`px-2.5 py-1 rounded-md font-semibold transition-colors text-[10px] ${currency === 'KES' ? 'bg-copper text-background' : 'text-muted-foreground hover:text-foreground'}`}>
          
          KES
        </button>
        <button
          onClick={() => onToggle('USD')}
          className={`px-2.5 py-1 rounded-md font-semibold transition-colors text-[10px] ${currency === 'USD' ? 'bg-copper text-background' : 'text-muted-foreground hover:text-foreground'}`}>
          
          USD
        </button>
      </div>);
  
  }