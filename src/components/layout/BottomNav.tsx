import { NavLink } from 'react-router-dom';
import { Home, CalendarDays, ShoppingCart, BookOpen, Shuffle, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/plan', icon: CalendarDays, label: 'Plan' },
  { to: '/shop', icon: ShoppingCart, label: 'Shop' },
  { to: '/recipes', icon: BookOpen, label: 'Recipes' },
  { to: '/takeout', icon: Shuffle, label: 'Takeout' },
  { to: '/more', icon: MoreHorizontal, label: 'More' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="flex items-stretch">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[60px] text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-6 rounded-full transition-colors',
                    isActive && 'bg-primary/10'
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={cn(isActive && 'font-semibold')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
