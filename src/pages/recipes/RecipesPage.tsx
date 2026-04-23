import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Clock, Zap, X, Pencil } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useFamilyStore } from '@/store/familyStore';
import { toast } from '@/hooks/use-toast';
import type { Recipe } from '@/types/database';

const AVAILABLE_TAGS = ['kid-approved', '<30min', 'high-protein', 'low-carb', 'make-ahead', 'leftover-safe', 'quick', 'budget-friendly'];

const recipeSchema = z.object({
  name: z.string().min(1, 'Name required'),
  emoji: z.string().min(1, 'Emoji required'),
  active_time_min: z.coerce.number().min(1),
  total_time_min: z.coerce.number().min(1),
  base_servings: z.coerce.number().min(1),
  calories_per_serving: z.coerce.number().nullable().optional(),
  protein_g: z.coerce.number().nullable().optional(),
  carbs_g: z.coerce.number().nullable().optional(),
  fat_g: z.coerce.number().nullable().optional(),
  kid_version_notes: z.string().optional(),
  make_ahead_notes: z.string().optional(),
  source_url: z.string().optional(),
  tags: z.array(z.string()),
  ingredients: z.array(z.object({
    emoji: z.string(),
    name: z.string().min(1),
    quantity: z.coerce.number().min(0.01),
    unit: z.string(),
    store_preference: z.enum(['target', 'walmart', 'bjs', 'amazon', 'any']),
    trip_type: z.enum(['weekly', 'bulk', 'subscribe', 'any']),
  })),
  steps: z.array(z.object({
    instruction: z.string().min(1),
    timer_seconds: z.coerce.number().nullable().optional(),
  })),
});

type RecipeForm = z.infer<typeof recipeSchema>;

const EMPTY_DEFAULTS: RecipeForm = {
  emoji: '🍽️',
  name: '',
  base_servings: 3.5,
  active_time_min: 20,
  total_time_min: 30,
  tags: [],
  ingredients: [{ emoji: '🥩', name: '', quantity: 1, unit: 'lb', store_preference: 'target', trip_type: 'weekly' }],
  steps: [{ instruction: '', timer_seconds: null }],
  calories_per_serving: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  kid_version_notes: '',
  make_ahead_notes: '',
  source_url: '',
};

export default function RecipesPage() {
  const familyId = useFamilyStore((s) => s.familyId);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase.from('recipes').select().eq('family_id', familyId!).order('name');
      return (data ?? []) as Recipe[];
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<RecipeForm>({
    resolver: zodResolver(recipeSchema) as any,
    defaultValues: EMPTY_DEFAULTS,
  });

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({ control, name: 'ingredients' });
  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({ control, name: 'steps' });
  const watchedTags = watch('tags');

  function openAdd() {
    setEditingRecipe(null);
    reset(EMPTY_DEFAULTS);
    setFormOpen(true);
  }

  async function openEdit(recipe: Recipe) {
    setEditingRecipe(recipe);
    setViewRecipe(null);

    const [{ data: ings }, { data: steps }] = await Promise.all([
      supabase.from('ingredients').select().eq('recipe_id', recipe.id),
      supabase.from('recipe_steps').select().eq('recipe_id', recipe.id).order('step_number'),
    ]);

    reset({
      name: recipe.name,
      emoji: recipe.emoji,
      active_time_min: recipe.active_time_min,
      total_time_min: recipe.total_time_min,
      base_servings: recipe.base_servings,
      calories_per_serving: recipe.calories_per_serving ?? null,
      protein_g: recipe.protein_g ?? null,
      carbs_g: recipe.carbs_g ?? null,
      fat_g: recipe.fat_g ?? null,
      kid_version_notes: recipe.kid_version_notes ?? '',
      make_ahead_notes: recipe.make_ahead_notes ?? '',
      source_url: recipe.source_url ?? '',
      tags: recipe.tags ?? [],
      ingredients: (ings ?? []).map((i: Record<string, unknown>) => ({
        emoji: String(i.emoji ?? '🥄'),
        name: String(i.name ?? ''),
        quantity: Number(i.quantity ?? 1),
        unit: String(i.unit ?? ''),
        store_preference: (i.store_preference as RecipeForm['ingredients'][0]['store_preference']) ?? 'any',
        trip_type: (i.trip_type as RecipeForm['ingredients'][0]['trip_type']) ?? 'any',
      })),
      steps: (steps ?? []).map((s: Record<string, unknown>) => ({
        instruction: String(s.instruction ?? ''),
        timer_seconds: s.timer_seconds != null ? Number(s.timer_seconds) : null,
      })),
    });

    setFormOpen(true);
  }

  const saveRecipe = useMutation({
    mutationFn: async (values: RecipeForm) => {
      const { ingredients, steps, ...recipeData } = values;

      if (editingRecipe) {
        const { error } = await supabase
          .from('recipes')
          .update({ ...recipeData, nutrition_confidence: 'med' })
          .eq('id', editingRecipe.id);
        if (error) throw error;

        await supabase.from('ingredients').delete().eq('recipe_id', editingRecipe.id);
        await supabase.from('recipe_steps').delete().eq('recipe_id', editingRecipe.id);

        if (ingredients.length > 0) {
          await supabase.from('ingredients').insert(
            ingredients.map((ing) => ({ ...ing, recipe_id: editingRecipe.id }))
          );
        }
        if (steps.length > 0) {
          await supabase.from('recipe_steps').insert(
            steps.map((s, idx) => ({ ...s, recipe_id: editingRecipe.id, step_number: idx + 1 }))
          );
        }
      } else {
        const { data: recipe, error } = await supabase
          .from('recipes')
          .insert({ ...recipeData, family_id: familyId!, nutrition_confidence: 'med' })
          .select()
          .single();
        if (error) throw error;

        if (ingredients.length > 0) {
          await supabase.from('ingredients').insert(
            ingredients.map((ing) => ({ ...ing, recipe_id: recipe.id }))
          );
        }
        if (steps.length > 0) {
          await supabase.from('recipe_steps').insert(
            steps.map((s, idx) => ({ ...s, recipe_id: recipe.id, step_number: idx + 1 }))
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', familyId] });
      setFormOpen(false);
      setEditingRecipe(null);
      reset(EMPTY_DEFAULTS);
      toast({ title: editingRecipe ? 'Recipe updated! ✓' : 'Recipe saved! 🎉' });
    },
    onError: (e) => toast({ title: 'Error', description: String(e), variant: 'destructive' }),
  });

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', familyId] });
      setViewRecipe(null);
      toast({ title: 'Recipe deleted' });
    },
  });

  const filtered = recipes.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchTag = !activeTag || r.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  const allTags = [...new Set(recipes.flatMap((r) => r.tags))];

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold">Recipes</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search recipes..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setActiveTag(null)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              !activeTag ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeTag === tag ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={openAdd} hasSearch={!!search || !!activeTag} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((recipe) => (
            <button key={recipe.id} onClick={() => setViewRecipe(recipe)} className="text-left">
              <Card className="overflow-hidden hover:shadow-md transition-shadow active:scale-[0.98]">
                <CardContent className="p-3 space-y-2">
                  <div className="text-4xl">{recipe.emoji}</div>
                  <p className="font-semibold text-sm leading-tight line-clamp-2">{recipe.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {recipe.active_time_min}m
                    </span>
                    {recipe.protein_g && (
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {recipe.protein_g}g
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {recipe.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* View Recipe Dialog */}
      <Dialog open={!!viewRecipe} onOpenChange={(o) => !o && setViewRecipe(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto mx-4 max-w-lg">
          {viewRecipe && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <DialogTitle className="flex items-center gap-3 text-xl">
                    <span className="text-4xl">{viewRecipe.emoji}</span>
                    {viewRecipe.name}
                  </DialogTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0 mt-1"
                    onClick={() => openEdit(viewRecipe)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                </div>
              </DialogHeader>
              <RecipeDetail recipe={viewRecipe} onDelete={() => deleteRecipe.mutate(viewRecipe.id)} />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Recipe Dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditingRecipe(null); reset(EMPTY_DEFAULTS); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto mx-2 max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRecipe ? `Edit: ${editingRecipe.name}` : 'New Recipe'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => saveRecipe.mutate(v as RecipeForm))} className="space-y-4">
            <div className="flex gap-2">
              <div className="w-16">
                <Label className="text-xs">Emoji</Label>
                <Input {...register('emoji')} className="text-center text-xl" maxLength={2} />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Recipe name *</Label>
                <Input {...register('name')} placeholder="Grilled Chicken" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Active time (min)</Label>
                <Input type="number" {...register('active_time_min')} />
              </div>
              <div>
                <Label className="text-xs">Total time (min)</Label>
                <Input type="number" {...register('total_time_min')} />
              </div>
              <div>
                <Label className="text-xs">Servings</Label>
                <Input type="number" step="0.5" {...register('base_servings')} />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Nutrition (per serving)</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {(['calories_per_serving', 'protein_g', 'carbs_g', 'fat_g'] as const).map((field) => (
                  <div key={field}>
                    <Label className="text-xs text-muted-foreground">
                      {field === 'calories_per_serving' ? 'Cal' : field.replace('_g', '').toUpperCase()}
                    </Label>
                    <Input type="number" {...register(field)} placeholder="—" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Tags</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {AVAILABLE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const current = watchedTags ?? [];
                      setValue('tags', current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]);
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      (watchedTags ?? []).includes(tag) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Ingredients</Label>
                <Button type="button" size="sm" variant="ghost" onClick={() => appendIngredient({ emoji: '🥄', name: '', quantity: 1, unit: 'cup', store_preference: 'target', trip_type: 'weekly' })}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {ingredientFields.map((field, idx) => (
                  <div key={field.id} className="flex gap-1.5 items-start">
                    <Input {...register(`ingredients.${idx}.emoji`)} className="w-12 text-center px-1 text-lg" maxLength={2} />
                    <Input {...register(`ingredients.${idx}.name`)} placeholder="Ingredient" className="flex-1 min-w-0" />
                    <Input type="number" {...register(`ingredients.${idx}.quantity`)} className="w-14" step="0.1" />
                    <Input {...register(`ingredients.${idx}.unit`)} placeholder="lb" className="w-16" />
                    <button type="button" onClick={() => removeIngredient(idx)} className="text-muted-foreground hover:text-destructive mt-2.5">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Steps</Label>
                <Button type="button" size="sm" variant="ghost" onClick={() => appendStep({ instruction: '', timer_seconds: null })}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {stepFields.map((field, idx) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <span className="text-sm font-bold text-muted-foreground mt-3 w-5 flex-shrink-0">{idx + 1}.</span>
                    <Textarea {...register(`steps.${idx}.instruction`)} placeholder="Step instruction..." className="flex-1 min-h-[60px]" />
                    <button type="button" onClick={() => removeStep(idx)} className="text-muted-foreground hover:text-destructive mt-2.5">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Kid version notes</Label>
              <Textarea {...register('kid_version_notes')} placeholder="For the kids, serve without spice..." className="mt-1" />
            </div>

            <div>
              <Label className="text-xs">Make-ahead notes</Label>
              <Textarea {...register('make_ahead_notes')} placeholder="Can be prepped 2 days ahead..." className="mt-1" />
            </div>

            <DialogFooter className="flex-row gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setFormOpen(false); setEditingRecipe(null); reset(EMPTY_DEFAULTS); }}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saveRecipe.isPending}>
                {saveRecipe.isPending ? 'Saving...' : editingRecipe ? 'Save Changes' : 'Save Recipe'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="pb-2" />
    </div>
  );
}

function RecipeDetail({ recipe, onDelete }: { recipe: Recipe; onDelete: () => void }) {
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients', recipe.id],
    queryFn: async () => {
      const { data } = await supabase.from('ingredients').select().eq('recipe_id', recipe.id);
      return data ?? [];
    },
  });
  const { data: steps = [] } = useQuery({
    queryKey: ['recipe_steps', recipe.id],
    queryFn: async () => {
      const { data } = await supabase.from('recipe_steps').select().eq('recipe_id', recipe.id).order('step_number');
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted/50 rounded-xl p-2">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="font-bold">{recipe.active_time_min}m</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-2">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-bold">{recipe.total_time_min}m</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-2">
          <p className="text-xs text-muted-foreground">Servings</p>
          <p className="font-bold">{recipe.base_servings}</p>
        </div>
      </div>

      {recipe.protein_g && (
        <div className="flex gap-3 text-sm">
          {recipe.calories_per_serving && (
            <div className="flex-1 text-center">
              <p className="text-muted-foreground text-xs">Calories</p>
              <p className="font-semibold">{recipe.calories_per_serving}</p>
            </div>
          )}
          <div className="flex-1 text-center">
            <p className="text-muted-foreground text-xs">Protein</p>
            <p className="font-semibold text-green-600 dark:text-green-400">{recipe.protein_g}g</p>
          </div>
          {recipe.carbs_g && (
            <div className="flex-1 text-center">
              <p className="text-muted-foreground text-xs">Carbs</p>
              <p className="font-semibold">{recipe.carbs_g}g</p>
            </div>
          )}
          {recipe.fat_g && (
            <div className="flex-1 text-center">
              <p className="text-muted-foreground text-xs">Fat</p>
              <p className="font-semibold">{recipe.fat_g}g</p>
            </div>
          )}
        </div>
      )}

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
      )}

      {ingredients.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Ingredients</h3>
          <ul className="space-y-1.5">
            {ingredients.map((ing: Record<string, unknown>) => (
              <li key={String(ing.id)} className="flex items-center gap-2 text-sm">
                <span>{String(ing.emoji)}</span>
                <span className="flex-1">{String(ing.name)}</span>
                <span className="text-muted-foreground">{String(ing.quantity)} {String(ing.unit)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {steps.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Steps</h3>
          <ol className="space-y-2">
            {steps.map((step: Record<string, unknown>) => (
              <li key={String(step.id)} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {Number(step.step_number)}
                </span>
                <span className="flex-1 pt-0.5">{String(step.instruction)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {recipe.kid_version_notes && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">🧒 Kid version</p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">{recipe.kid_version_notes}</p>
        </div>
      )}

      {recipe.make_ahead_notes && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">⏰ Make ahead</p>
          <p className="text-sm text-blue-700 dark:text-blue-300">{recipe.make_ahead_notes}</p>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full text-destructive hover:bg-destructive/10 border-destructive/30"
        onClick={() => {
          if (confirm('Delete this recipe? This cannot be undone.')) onDelete();
        }}
      >
        Delete Recipe
      </Button>
    </div>
  );
}

function EmptyState({ onAdd, hasSearch }: { onAdd: () => void; hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <span className="text-6xl mb-4">📖</span>
      {hasSearch ? (
        <>
          <h3 className="font-semibold text-lg">No recipes found</h3>
          <p className="text-muted-foreground text-sm mt-1">Try a different search or tag</p>
        </>
      ) : (
        <>
          <h3 className="font-semibold text-lg">No recipes yet</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">Add your family favorites to get started</p>
          <Button onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add first recipe
          </Button>
        </>
      )}
    </div>
  );
}
