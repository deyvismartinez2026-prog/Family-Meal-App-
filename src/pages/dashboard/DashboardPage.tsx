import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { ShoppingCart, CalendarDays, Zap, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useFamilyStore } from '@/store/familyStore';

function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

export default function DashboardPage() {
  const familyId = useFamilyStore((s) => s.familyId);
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6), 'yyyy-MM-dd');

  const { data: tonightPlan, isLoading: loadingTonight } = useQuery({
    queryKey: ['meal_plan', familyId, today, 'dinner'],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('meal_plan')
        .select('*, recipes(*)')
        .eq('family_id', familyId!)
        .eq('date', today)
        .eq('meal_type', 'dinner')
        .maybeSingle();
      return data;
    },
  });

  const { data: weekPlan, isLoading: loadingWeek } = useQuery({
    queryKey: ['meal_plan_week', familyId, weekStart],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('meal_plan')
        .select('*, recipes(*)')
        .eq('family_id', familyId!)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date');
      return data ?? [];
    },
  });

  const { data: shoppingStats } = useQuery({
    queryKey: ['shopping_stats', familyId, weekStart],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('shopping_list')
        .select('store, status')
        .eq('family_id', familyId!)
        .eq('week_of', weekStart)
        .eq('status', 'needed');
      const byStore: Record<string, number> = {};
      (data ?? []).forEach((item) => {
        byStore[item.store] = (byStore[item.store] ?? 0) + 1;
      });
      return byStore;
    },
  });

  const { data: members } = useQuery({
    queryKey: ['family_members', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('family_members')
        .select()
        .eq('family_id', familyId!);
      return data ?? [];
    },
  });

  const isLoading = loadingTonight || loadingWeek;

  if (isLoading) return <DashboardSkeleton />;

  const recipe = (tonightPlan as { recipes?: { name?: string; emoji?: string; active_time_min?: number; protein_g?: number } | null } | null)?.recipes;
  const totalShoppingItems = Object.values(shoppingStats ?? {}).reduce((a, b) => a + b, 0);
  const topStore = Object.entries(shoppingStats ?? {}).sort((a, b) => b[1] - a[1])[0];

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i)
  );

  const deyvis = members?.find((m) => m.role === 'adult' && m.name.toLowerCase().includes('deyvis') || m.name.toLowerCase().includes('d'));
  const proteinTarget = deyvis?.protein_target_g ?? 160;

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold">Good {getGreeting()} 👋</h1>
          <p className="text-muted-foreground text-sm">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <div className="text-3xl">🍽️</div>
      </div>

      {/* Tonight's Dinner */}
      <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Tonight's Dinner
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tonightPlan && recipe ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-4xl">{recipe.emoji ?? '🍽️'}</span>
                <div className="flex-1">
                  <p className="font-bold text-lg leading-tight">{recipe.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ⏱ {recipe.active_time_min} min active
                    {recipe.protein_g ? ` · ${recipe.protein_g}g protein` : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <Link to="/recipes">View Recipe</Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <Link to="/plan">Swap</Link>
                </Button>
              </div>
            </div>
          ) : tonightPlan?.chef_night_off ? (
            <div className="text-center py-2">
              <p className="text-3xl">😴</p>
              <p className="font-semibold mt-1">Chef's Night Off</p>
              <p className="text-sm text-muted-foreground">Order takeout or go easy tonight</p>
              <Button size="sm" className="mt-2" asChild>
                <Link to="/takeout">🎲 Spin Takeout</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-muted-foreground text-sm">Nothing planned yet</p>
              <Button size="sm" asChild>
                <Link to="/plan">
                  <Plus className="mr-1 h-4 w-4" /> Plan dinner
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* This Week at a Glance */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <CalendarDays className="h-4 w-4" /> This Week
            </CardTitle>
            <Link to="/plan" className="text-xs text-primary font-medium">
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {weekDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayPlans = (weekPlan ?? []).filter((p) => p.date === dayStr);
              const lunch = dayPlans.find((p) => p.meal_type === 'lunch');
              const dinner = dayPlans.find((p) => p.meal_type === 'dinner');
              const lunchRecipe = (lunch as { recipes?: { emoji?: string } } | undefined)?.recipes;
              const dinnerRecipe = (dinner as { recipes?: { emoji?: string } } | undefined)?.recipes;

              return (
                <div
                  key={dayStr}
                  className={`flex flex-col items-center gap-1 min-w-[52px] p-2 rounded-xl ${
                    isToday(day) ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-muted/40'
                  }`}
                >
                  <span className="text-xs font-semibold text-muted-foreground">
                    {format(day, 'EEE')}
                  </span>
                  <span className="text-xl">{lunchRecipe?.emoji ?? (lunch?.chef_night_off ? '😴' : '—')}</span>
                  <span className="text-xl">{dinnerRecipe?.emoji ?? (dinner?.chef_night_off ? '😴' : '—')}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Protein Pulse */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Zap className="h-4 w-4" /> Protein Pulse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Weekly target: {proteinTarget}g/day</span>
            <span className="text-muted-foreground">7-day avg: —</span>
          </div>
          <Progress value={0} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Plan meals with protein info to track this automatically.
          </p>
        </CardContent>
      </Card>

      {/* Shopping Status */}
      {totalShoppingItems > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">{totalShoppingItems} items to buy</p>
                  {topStore && (
                    <p className="text-sm text-muted-foreground">
                      Next trip: {storeLabel(topStore[0])} ({topStore[1]} items)
                    </p>
                  )}
                </div>
              </div>
              <Button size="sm" asChild>
                <Link to="/shop">View</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <QuickAction to="/plan" emoji="📅" label="Plan Week" />
        <QuickAction to="/takeout" emoji="🎲" label="Takeout?" />
        <QuickAction to="/recipes" emoji="📖" label="Add Recipe" />
      </div>

      <div className="pb-2" />
    </div>
  );
}

function QuickAction({ to, emoji, label }: { to: string; emoji: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-muted/60 hover:bg-muted active:scale-95 transition-all"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs font-medium text-center leading-tight">{label}</span>
    </Link>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function storeLabel(store: string) {
  const labels: Record<string, string> = {
    target: '🎯 Target',
    walmart: '🏪 Walmart',
    bjs: '📦 BJ\'s',
    amazon: '📮 Amazon',
    any: 'Any Store',
  };
  return labels[store] ?? store;
}
