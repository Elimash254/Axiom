import { Lightbulb } from 'lucide-react';

const quotes = [
  "Discipline is choosing what you want most over what you want now.",
  "Small steps every day build extraordinary lives.",
  "You don't have to be extreme, just consistent.",
  "The best time to plant a tree was 20 years ago. The second best is now.",
  "Your future is created by what you do today, not tomorrow.",
  "Don't watch the clock; do what it does — keep going.",
  "Success isn't given. It's earned in the gym, on the field, in every quiet morning.",
];

export default function EmptyState({ title, subtitle, action }) {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-4">
        <Lightbulb className="w-6 h-6 text-copper" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">{subtitle}</p>
      {action}
      <p className="text-xs text-muted-foreground/60 italic mt-8 max-w-xs">"{quote}"</p>
    </div>
  );
}