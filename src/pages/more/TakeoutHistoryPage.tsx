import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useFamilyStore } from '@/store/familyStore';
import type { TakeoutHistory, Restaurant } from '@/types/database';

export default function TakeoutHistoryPage() {
  const familyId = useFamilyStore((s) => s.familyId);

  const { data: history = [] } = useQuery({
    queryKey: ['takeout_history', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase.from('takeout_history').select().eq('family_id', familyId!).order('date', { ascending: false });
      return (data ?? []) as TakeoutHistory[];
    },
  });

  const { data: restaurants = [] } = useQuery({
    queryKey: ['restaurants', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase.from('restaurants').select().eq('family_id', familyId!);
      return (data ?? []) as Restaurant[];
    },
  });

  const totalSpend = history.reduce((s, h) => s + (h.est_cost ?? 0), 0);
  const thisMonth = history.filter((h) => h.date.startsWith(format(new Date(), 'yyyy-MM')));

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 pt-2">
        <Link to="/more"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-bold">Takeout History</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">This Month</p>
          <p className="text-2xl font-bold">{thisMonth.length}x</p>
        </div>
        <div className="bg-muted/50 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Total Tracked Spend</p>
          <p className="text-2xl font-bold">${totalSpend.toFixed(0)}</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-5xl mb-3">📋</p>
          <p className="font-semibold">No history yet</p>
          <p className="text-sm text-muted-foreground mt-2">Use the Takeout spinner to log orders</p>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-3 pb-2 divide-y divide-border">
            {history.map((h) => {
              const restaurant = restaurants.find((r) => r.id === h.restaurant_id);
              return (
                <div key={h.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-2xl">{restaurant?.emoji ?? '🍽️'}</span>
                  <div className="flex-1">
                    <p className="font-medium">{restaurant?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(h.date + 'T12:00:00'), 'EEE, MMM d')}
                      {h.dish_ordered ? ` · ${h.dish_ordered}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    {h.est_cost && <p className="text-sm font-medium">${h.est_cost}</p>}
                    {h.rating && (
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs">{h.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="pb-2" />
    </div>
  );
}
