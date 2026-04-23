import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const items = [
  { to: '/more/pantry', label: 'Pantry', desc: 'Track what you have at home', emoji: '🥫' },
  { to: '/more/kid-log', label: 'Kid Food Log', desc: 'New foods tried + retry queue', emoji: '🧒' },
  { to: '/more/photos', label: 'Meal Photos', desc: 'Your family food gallery', emoji: '📸' },
  { to: '/more/feedback', label: 'Feedback History', desc: 'Past meal ratings', emoji: '⭐' },
  { to: '/more/takeout-history', label: 'Takeout History', desc: 'Full order log + spending', emoji: '📋' },
  { to: '/more/settings', label: 'Settings', desc: 'Family, protein targets, code', emoji: '⚙️' },
];

export default function MorePage() {
  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">More</h1>
        <p className="text-muted-foreground text-sm">Pantry, kid log, photos, settings</p>
      </div>

      <div className="rounded-2xl border overflow-hidden divide-y divide-border">
        {items.map(({ to, label, desc, emoji }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 px-4 py-4 hover:bg-muted/50 active:bg-muted transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-xl">{emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground truncate">{desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </Link>
        ))}
      </div>

      <div className="pb-2" />
    </div>
  );
}
