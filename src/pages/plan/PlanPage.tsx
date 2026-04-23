import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, addDays, addWeeks, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useFamilyStore } from '@/store/familyStore';
import { toast } from '@/hooks/use-toast';
import type { MealPlan, Recipe } from '@/types/database';

type MealPlanWithRecipe = MealPlan & { recipes: Recipe | null };

export default function PlanPage() {
  const familyId = useFamilyStore((s) => s.familyId);
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [addModal, setAddModal] = useState<{ date: string; meal_type: 'lunch' | 'dinner' } | null>(null);
  const [recipeSearch, setRecipeSearch] = useState('');

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['meal_plan', familyId, weekStartStr],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('meal_plan')
        .select('*, recipes(*)')
        .eq('family_id', familyId!)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr)
        .order('date');
      return (data ?? []) as MealPlanWithRecipe[];
    },
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes', familyId],
    enabled: !!familyId && !!addModal,
    queryFn: async () => {
      const { data } = await supabase.from('recipes').select().eq('family_id', familyId!).order('name');
      return (data ?? []) as Recipe[];
    },
  });

  const addMeal = useMutation({
    mutationFn: async ({
      date,
      meal_type,
      recipe_id,
      chef_night_off,
    }: {
      date: string;
      meal_type: 'lunch' | 'dinner';
      recipe_id?: string;
      chef_night_off?: boolean;
    }) => {
      const { error } = await supabase.from('meal_plan').upsert({
        family_id: familyId!,
        date,
        meal_type,
        recipe_id: recipe_id ?? null,
        chef_night_off: chef_night_off ?? false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal_plan', familyId, weekStartStr] });
      setAddModal(null);
      toast({ title: 'Meal planned! 🎉' });
    },
    onError: (e) => toast({ title: 'Error', description: String(e), variant: 'destructive' }),
  });

  const removeMeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meal_plan').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal_plan', familyId, weekStartStr] });
      toast({ title: 'Removed' });
    },
  });

  function getPlan(date: string, meal_type: 'lunch' | 'dinner') {
    return plans.find((p) => p.date === date && p.meal_type === meal_type);
  }

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Week nav */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold">Meal Plan</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset(0)}
            className={weekOffset === 0 ? 'font-bold text-primary' : ''}
          >
            {weekOffset === 0
              ? 'This Week'
              : weekOffset === 1
              ? 'Next Week'
              : weekOffset === -1
              ? 'Last Week'
              : format(weekStart, 'MMM d')}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o + 1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground -mt-2">
        {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
      </p>

      {/* Weekly grid */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const lunchPlan = getPlan(dateStr, 'lunch');
            const dinnerPlan = getPlan(dateStr, 'dinner');

            return (
              <Card
                key={dateStr}
                className={`overflow-hidden ${isToday(day) ? 'ring-2 ring-primary/40' : ''}`}
              >
                <div className="flex items-center gap-3 px-4 py-2 bg-muted/30">
                  <div
                    className={`flex flex-col items-center w-10 ${
                      isToday(day) ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase">{format(day, 'EEE')}</span>
                    <span className="text-lg font-bold leading-tight">{format(day, 'd')}</span>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <MealSlot
                      label="Lunch"
                      plan={lunchPlan}
                      onAdd={() => setAddModal({ date: dateStr, meal_type: 'lunch' })}
                      onRemove={(id) => removeMeal.mutate(id)}
                    />
                    <MealSlot
                      label="Dinner"
                      plan={dinnerPlan}
                      onAdd={() => setAddModal({ date: dateStr, meal_type: 'dinner' })}
                      onRemove={(id) => removeMeal.mutate(id)}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Meal Dialog */}
      <Dialog open={!!addModal} onOpenChange={(o) => !o && setAddModal(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle>
              Pick a meal for{' '}
              {addModal
                ? format(new Date(addModal.date + 'T12:00:00'), 'EEE, MMM d') +
                  ' ' +
                  addModal.meal_type
                : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search recipes..."
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                addMeal.mutate({
                  date: addModal!.date,
                  meal_type: addModal!.meal_type,
                  chef_night_off: true,
                })
              }
            >
              😴 Chef's Night Off
            </Button>
            {filteredRecipes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">📖</p>
                <p className="text-muted-foreground text-sm">
                  {recipeSearch ? 'No recipes match your search' : 'No recipes yet'}
                </p>
                <Button size="sm" className="mt-2" asChild>
                  <a href="/recipes">Add your first recipe</a>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-xl border hover:bg-accent transition-colors"
                    onClick={() =>
                      addMeal.mutate({
                        date: addModal!.date,
                        meal_type: addModal!.meal_type,
                        recipe_id: recipe.id,
                      })
                    }
                  >
                    <span className="text-2xl">{recipe.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{recipe.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ⏱ {recipe.active_time_min}min
                        {recipe.protein_g ? ` · ${recipe.protein_g}g protein` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {recipe.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="pb-2" />
    </div>
  );
}

function MealSlot({
  label,
  plan,
  onAdd,
  onRemove,
}: {
  label: string;
  plan: MealPlanWithRecipe | undefined;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const recipe = plan?.recipes;
  const emoji = label === 'Lunch' ? '☀️' : '🌙';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-12 flex-shrink-0">
        {emoji} {label}
      </span>
      {plan ? (
        <div className="flex-1 flex items-center justify-between bg-background rounded-lg px-2.5 py-1.5 border">
          <span className="text-sm font-medium truncate">
            {plan.chef_night_off ? (
              <span className="text-muted-foreground">Chef's Night Off 😴</span>
            ) : plan.is_leftover ? (
              <span>↩️ Leftovers {recipe ? `(${recipe.emoji} ${recipe.name})` : ''}</span>
            ) : recipe ? (
              <span>
                {recipe.emoji} {recipe.name}
              </span>
            ) : (
              <span className="text-muted-foreground">No recipe linked</span>
            )}
          </span>
          <button
            onClick={() => onRemove(plan.id)}
            className="ml-2 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={onAdd}
          className="flex-1 flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg px-2.5 py-1.5 border border-dashed transition-colors text-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add meal</span>
        </button>
      )}
    </div>
  );
}

