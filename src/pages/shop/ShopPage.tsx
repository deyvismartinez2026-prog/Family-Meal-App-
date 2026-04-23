import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek } from 'date-fns';
import { Plus, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useFamilyStore } from '@/store/familyStore';
import { toast } from '@/hooks/use-toast';
import type { ShoppingItem, StoreType } from '@/types/database';

const STORES: { id: StoreType; label: string; emoji: string; color: string }[] = [
  { id: 'target', label: 'Target', emoji: '🎯', color: 'bg-red-50 dark:bg-red-950/20' },
  { id: 'walmart', label: 'Walmart Market', emoji: '🏪', color: 'bg-blue-50 dark:bg-blue-950/20' },
  { id: 'bjs', label: "BJ's", emoji: '📦', color: 'bg-yellow-50 dark:bg-yellow-950/20' },
  { id: 'amazon', label: 'Amazon', emoji: '📮', color: 'bg-purple-50 dark:bg-purple-950/20' },
  { id: 'any', label: 'Other', emoji: '🛍️', color: 'bg-muted/40' },
];

export default function ShopPage() {
  const familyId = useFamilyStore((s) => s.familyId);
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: '', emoji: '🛒', qty: 1, unit: 'item', store: 'target' as StoreType });

  const weekOf = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['shopping_list', familyId, weekOf],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('shopping_list')
        .select()
        .eq('family_id', familyId!)
        .eq('week_of', weekOf)
        .order('status')
        .order('item_name');
      return (data ?? []) as ShoppingItem[];
    },
  });

  const toggleItem = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'needed' | 'bought' }) => {
      const { error } = await supabase
        .from('shopping_list')
        .update({ status, checked_at: status === 'bought' ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping_list', familyId, weekOf] }),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('shopping_list').insert({
        family_id: familyId!,
        week_of: weekOf,
        ...newItem,
        status: 'needed',
        linked_recipe_ids: [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping_list', familyId, weekOf] });
      setAddOpen(false);
      setNewItem({ item_name: '', emoji: '🛒', qty: 1, unit: 'item', store: 'target' });
      toast({ title: 'Item added! ✓' });
    },
    onError: (e) => toast({ title: 'Error', description: String(e), variant: 'destructive' }),
  });

  const neededCount = items.filter((i) => i.status === 'needed').length;
  const boughtCount = items.filter((i) => i.status === 'bought').length;

  const itemsByStore = STORES.map((store) => ({
    ...store,
    items: items.filter((i) => i.store === store.id),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold">Shopping List</h1>
          <p className="text-sm text-muted-foreground">
            {neededCount} to buy · {boughtCount} done
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Item
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {itemsByStore.map(({ id, label, emoji, color, items: storeItems }) => {
            const neededItems = storeItems.filter((i) => i.status === 'needed');
            const boughtItems = storeItems.filter((i) => i.status === 'bought');
            return (
              <Card key={id} className="overflow-hidden">
                <CardHeader className={`py-3 ${color}`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{emoji}</span>
                      <span>{label}</span>
                      <Badge variant="outline" className="text-xs">
                        {neededItems.length} left
                      </Badge>
                    </CardTitle>
                    {neededItems.length === 0 && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-3 pb-2 divide-y divide-border">
                  {neededItems.map((item) => (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      onToggle={(status) => toggleItem.mutate({ id: item.id, status })}
                    />
                  ))}
                  {boughtItems.map((item) => (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      onToggle={(status) => toggleItem.mutate({ id: item.id, status })}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Add Shopping Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="w-16">
                <Label className="text-xs">Emoji</Label>
                <Input
                  value={newItem.emoji}
                  onChange={(e) => setNewItem((p) => ({ ...p, emoji: e.target.value }))}
                  className="text-center text-xl"
                  maxLength={2}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Item name</Label>
                <Input
                  placeholder="Chicken breast"
                  value={newItem.item_name}
                  onChange={(e) => setNewItem((p) => ({ ...p, item_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-20">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={newItem.qty}
                  onChange={(e) => setNewItem((p) => ({ ...p, qty: parseFloat(e.target.value) || 1 }))}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Unit</Label>
                <Input
                  placeholder="lbs, oz, bags..."
                  value={newItem.unit}
                  onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Store</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {STORES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setNewItem((p) => ({ ...p, store: s.id }))}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      newItem.store === s.id
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!newItem.item_name.trim() || addItem.isPending}
              onClick={() => addItem.mutate()}
            >
              {addItem.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add to list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pb-2" />
    </div>
  );
}

function ShoppingItemRow({
  item,
  onToggle,
}: {
  item: ShoppingItem;
  onToggle: (status: 'needed' | 'bought') => void;
}) {
  const bought = item.status === 'bought';
  return (
    <div className={`flex items-center gap-3 py-2.5 ${bought ? 'opacity-50' : ''}`}>
      <Checkbox
        checked={bought}
        onCheckedChange={(c) => onToggle(c ? 'bought' : 'needed')}
        className="h-6 w-6"
      />
      <span className="text-xl">{item.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${bought ? 'line-through' : ''}`}>{item.item_name}</p>
        <p className="text-xs text-muted-foreground">
          {item.qty} {item.unit}
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <span className="text-6xl mb-4">🛒</span>
      <h3 className="font-semibold text-lg">Your list is empty</h3>
      <p className="text-muted-foreground text-sm mt-1 mb-4">
        Generate from your meal plan, or add items manually.
      </p>
    </div>
  );
}
