import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Shuffle, Plus, ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useFamilyStore } from '@/store/familyStore';
import { toast } from '@/hooks/use-toast';
import type { Restaurant, TakeoutHistory } from '@/types/database';

type FilterState = {
  cuisine: string | null;
  priceTier: string | null;
};

type RestaurantWithWeight = Restaurant & { weight: number; lastOrdered: string | null };

export default function TakeoutPage() {
  const familyId = useFamilyStore((s) => s.familyId);
  const queryClient = useQueryClient();
  const [spinning, setSpinning] = useState(false);
  const [finalists, setFinalists] = useState<RestaurantWithWeight[]>([]);
  const [vetoed, setVetoed] = useState<Set<string>>(new Set());
  const [vetoUsed, setVetoUsed] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ cuisine: null, priceTier: null });
  const [picked, setPicked] = useState<RestaurantWithWeight | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [spinEmoji, setSpinEmoji] = useState('🎲');
  const [newRestaurant, setNewRestaurant] = useState({
    name: '', emoji: '🍽️', cuisine: '', price_tier: '$' as '$' | '$$' | '$$$',
    typical_dish: '', delivery_apps: [] as string[], avg_delivery_min: 30, notes: '',
  });

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['restaurants', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase.from('restaurants').select().eq('family_id', familyId!).eq('is_active', true).order('name');
      return (data ?? []) as Restaurant[];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ['takeout_history', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase.from('takeout_history').select().eq('family_id', familyId!).order('date', { ascending: false }).limit(50);
      return (data ?? []) as TakeoutHistory[];
    },
  });

  const addRestaurant = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('restaurants').insert({
        family_id: familyId!,
        ...newRestaurant,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', familyId] });
      setAddOpen(false);
      setNewRestaurant({ name: '', emoji: '🍽️', cuisine: '', price_tier: '$', typical_dish: '', delivery_apps: [], avg_delivery_min: 30, notes: '' });
      toast({ title: 'Restaurant added! 🎉' });
    },
    onError: (e) => toast({ title: 'Error', description: String(e), variant: 'destructive' }),
  });

  const logTakeout = useMutation({
    mutationFn: async (restaurant: RestaurantWithWeight) => {
      const { error } = await supabase.from('takeout_history').insert({
        family_id: familyId!,
        restaurant_id: restaurant.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        picked_by: 'Family',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['takeout_history', familyId] });
      toast({ title: '🍕 Order logged!' });
    },
  });

  function computeWeights(exclude?: Set<string>): RestaurantWithWeight[] {
    const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd');
    const fourteenDaysAgo = format(subDays(new Date(), 14), 'yyyy-MM-dd');

    return restaurants
      .filter((r) => {
        if (exclude?.has(r.id)) return false;
        const lastOrder = history.find((h) => h.restaurant_id === r.id);
        if (lastOrder && lastOrder.date >= threeDaysAgo) return false;
        if (filters.cuisine && r.cuisine !== filters.cuisine) return false;
        if (filters.priceTier && r.price_tier !== filters.priceTier) return false;
        return true;
      })
      .map((r) => {
        const lastOrder = history.find((h) => h.restaurant_id === r.id);
        const recentlyOrdered = lastOrder && lastOrder.date >= fourteenDaysAgo;
        return {
          ...r,
          weight: recentlyOrdered ? 0.3 : 1.0,
          lastOrdered: lastOrder?.date ?? null,
        };
      });
  }

  function weightedPick(pool: RestaurantWithWeight[], n: number, exclude?: Set<string>): RestaurantWithWeight[] {
    const available = pool.filter((r) => !exclude?.has(r.id));
    if (available.length === 0) return [];
    const picked: RestaurantWithWeight[] = [];
    const usedIds = new Set<string>();

    for (let i = 0; i < Math.min(n, available.length); i++) {
      const remaining = available.filter((r) => !usedIds.has(r.id));
      const remWeight = remaining.reduce((s, r) => s + r.weight, 0);
      let rand = Math.random() * remWeight;
      for (const r of remaining) {
        rand -= r.weight;
        if (rand <= 0) {
          picked.push(r);
          usedIds.add(r.id);
          break;
        }
      }
    }
    return picked;
  }

  async function handleSpin() {
    if (restaurants.length === 0) {
      toast({ title: 'Add some restaurants first!', variant: 'destructive' });
      return;
    }
    setSpinning(true);
    setFinalists([]);
    setPicked(null);
    setVetoed(new Set());
    setVetoUsed(false);

    const emojis = ['🎲', '🎰', '🎯', '🎪', '🎨'];
    let i = 0;
    const interval = setInterval(() => {
      setSpinEmoji(emojis[i % emojis.length]);
      i++;
    }, 150);

    await new Promise((r) => setTimeout(r, 1500));
    clearInterval(interval);
    setSpinEmoji('🎉');
    setSpinning(false);

    const pool = computeWeights(vetoed);
    const results = weightedPick(pool, 3, vetoed);
    setFinalists(results);
  }

  function handleVeto(id: string) {
    if (vetoUsed) {
      toast({ title: 'One veto per round! Pick from what\'s left.' });
      return;
    }
    setVetoUsed(true);
    const newVetoed = new Set([...vetoed, id]);
    setVetoed(newVetoed);
    const newFinalists = finalists.filter((f) => f.id !== id);
    const pool = computeWeights(newVetoed);
    const replacement = weightedPick(pool, 1, new Set(newFinalists.map((f) => f.id)));
    setFinalists([...newFinalists, ...replacement]);
  }

  function handlePick(restaurant: RestaurantWithWeight) {
    setPicked(restaurant);
    setFinalists([]);
    logTakeout.mutate(restaurant);
  }

  const cuisines = [...new Set(restaurants.map((r) => r.cuisine))];

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold">Takeout</h1>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <Tabs defaultValue="spin">
        <TabsList className="w-full">
          <TabsTrigger value="spin" className="flex-1">🎲 Spin</TabsTrigger>
          <TabsTrigger value="restaurants" className="flex-1">📋 Restaurants</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">📅 History</TabsTrigger>
        </TabsList>

        <TabsContent value="spin" className="space-y-4 mt-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4 pb-3 space-y-3">
              <p className="text-sm font-semibold">Filters (optional)</p>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Cuisine</p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip label="Any" active={!filters.cuisine} onClick={() => setFilters((f) => ({ ...f, cuisine: null }))} />
                  {cuisines.map((c) => (
                    <FilterChip key={c} label={c} active={filters.cuisine === c} onClick={() => setFilters((f) => ({ ...f, cuisine: f.cuisine === c ? null : c }))} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Budget</p>
                <div className="flex gap-2">
                  {(['$', '$$', '$$$'] as const).map((tier) => (
                    <FilterChip key={tier} label={tier} active={filters.priceTier === tier} onClick={() => setFilters((f) => ({ ...f, priceTier: f.priceTier === tier ? null : tier }))} />
                  ))}
                  <FilterChip label="Any" active={!filters.priceTier} onClick={() => setFilters((f) => ({ ...f, priceTier: null }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spin button */}
          {!finalists.length && !picked && (
            <div className="flex flex-col items-center py-6 gap-4">
              <div
                className={`text-8xl transition-transform ${spinning ? 'animate-bounce' : ''}`}
                style={{ userSelect: 'none' }}
              >
                {spinEmoji}
              </div>
              <Button
                size="lg"
                className="w-48 text-lg font-bold h-14"
                onClick={handleSpin}
                disabled={spinning || isLoading}
              >
                {spinning ? 'Spinning...' : 'SPIN! 🎰'}
              </Button>
              {restaurants.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground">Add restaurants first →</p>
              )}
            </div>
          )}

          {/* Finalists */}
          {finalists.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-center text-muted-foreground">🎯 Your finalists — pick one!</p>
              {finalists.map((r) => (
                <Card key={r.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{r.emoji}</span>
                        <div>
                          <p className="font-semibold">{r.name}</p>
                          <p className="text-sm text-muted-foreground">{r.cuisine} · {r.price_tier}</p>
                          {r.typical_dish && <p className="text-xs text-muted-foreground mt-0.5">🍽️ {r.typical_dish}</p>}
                          {r.lastOrdered && (
                            <p className="text-xs text-muted-foreground">
                              Last: {format(new Date(r.lastOrdered + 'T12:00:00'), 'MMM d')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" className="gap-1" onClick={() => handlePick(r)}>
                          <ThumbsUp className="h-4 w-4" /> Pick
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => handleVeto(r.id)}
                          disabled={vetoUsed}
                        >
                          <ThumbsDown className="h-4 w-4" /> Veto
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full" onClick={handleSpin}>
                <Shuffle className="mr-2 h-4 w-4" /> Respin
              </Button>
            </div>
          )}

          {/* Picked */}
          {picked && (
            <div className="flex flex-col items-center py-6 gap-4 text-center animate-fade-in">
              <div className="text-6xl">{picked.emoji}</div>
              <div>
                <p className="text-2xl font-bold">{picked.name}</p>
                <p className="text-muted-foreground">{picked.cuisine} · {picked.price_tier}</p>
                {picked.typical_dish && <p className="text-sm mt-1">🍽️ Get the {picked.typical_dish}</p>}
              </div>
              <Badge variant="success" className="text-sm px-4 py-1">✓ Logged to history</Badge>
              <Button variant="outline" onClick={handleSpin}>
                <Shuffle className="mr-2 h-4 w-4" /> Spin again
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="restaurants" className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
          ) : restaurants.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">🍕</p>
              <p className="font-semibold">No restaurants yet</p>
              <p className="text-sm text-muted-foreground mb-4">Add your favorites to spin!</p>
              <Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add restaurant</Button>
            </div>
          ) : (
            restaurants.map((r) => {
              const lastOrder = history.find((h) => h.restaurant_id === r.id);
              return (
                <Card key={r.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <span className="text-3xl">{r.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-sm text-muted-foreground">{r.cuisine} · {r.price_tier}</p>
                      {lastOrder && (
                        <p className="text-xs text-muted-foreground">
                          Last ordered: {format(new Date(lastOrder.date + 'T12:00:00'), 'MMM d')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {r.delivery_apps.map((app) => (
                        <Badge key={app} variant="outline" className="text-xs">{app}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">📅</p>
              <p className="font-semibold">No takeout history yet</p>
              <p className="text-sm text-muted-foreground">Spin the randomizer to get started!</p>
            </div>
          ) : (
            history.slice(0, 20).map((h) => {
              const restaurant = restaurants.find((r) => r.id === h.restaurant_id);
              return (
                <div key={h.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className="text-2xl">{restaurant?.emoji ?? '🍽️'}</span>
                  <div className="flex-1">
                    <p className="font-medium">{restaurant?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(h.date + 'T12:00:00'), 'EEE, MMM d')}
                      {h.est_cost ? ` · $${h.est_cost}` : ''}
                    </p>
                  </div>
                  {h.rating && (
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium">{h.rating}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Add Restaurant Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle>Add Restaurant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="w-16">
                <Label className="text-xs">Emoji</Label>
                <Input value={newRestaurant.emoji} onChange={(e) => setNewRestaurant((p) => ({ ...p, emoji: e.target.value }))} className="text-center text-xl" maxLength={2} />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Restaurant name *</Label>
                <Input placeholder="Pizza Palace" value={newRestaurant.name} onChange={(e) => setNewRestaurant((p) => ({ ...p, name: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Cuisine</Label>
                <Input placeholder="Italian, Mexican..." value={newRestaurant.cuisine} onChange={(e) => setNewRestaurant((p) => ({ ...p, cuisine: e.target.value }))} />
              </div>
              <div className="w-24">
                <Label className="text-xs">Price</Label>
                <div className="flex gap-1 mt-1">
                  {(['$', '$$', '$$$'] as const).map((t) => (
                    <button key={t} onClick={() => setNewRestaurant((p) => ({ ...p, price_tier: t }))}
                      className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${newRestaurant.price_tier === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Go-to dish</Label>
              <Input placeholder="Margherita pizza" value={newRestaurant.typical_dish} onChange={(e) => setNewRestaurant((p) => ({ ...p, typical_dish: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Delivery apps</Label>
              <div className="flex gap-2 mt-1">
                {['DoorDash', 'UberEats', 'Direct'].map((app) => (
                  <button key={app}
                    onClick={() => setNewRestaurant((p) => ({ ...p, delivery_apps: p.delivery_apps.includes(app) ? p.delivery_apps.filter((a) => a !== app) : [...p.delivery_apps, app] }))}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${newRestaurant.delivery_apps.includes(app) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                    {app}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="flex-1" disabled={!newRestaurant.name.trim() || addRestaurant.isPending} onClick={() => addRestaurant.mutate()}>
              Save Restaurant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pb-2" />
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
    >
      {label}
    </button>
  );
}
