import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useFamilyStore } from '@/store/familyStore';
import { toast } from '@/hooks/use-toast';
import type { PantryItem } from '@/types/database';

export default function PantryPage() {
  const familyId = useFamilyStore((s) => s.familyId);
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: '', emoji: '🥫', quantity: 1, unit: 'item', expires_on: '' });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['pantry', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase.from('pantry').select().eq('family_id', familyId!).order('item_name');
      return (data ?? []) as PantryItem[];
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('pantry').insert({
        family_id: familyId!,
        item_name: newItem.item_name,
        emoji: newItem.emoji,
        quantity: newItem.quantity,
        unit: newItem.unit,
        expires_on: newItem.expires_on || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pantry', familyId] });
      setAddOpen(false);
      setNewItem({ item_name: '', emoji: '🥫', quantity: 1, unit: 'item', expires_on: '' });
      toast({ title: 'Added to pantry!' });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pantry').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pantry', familyId] }),
  });

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date).getTime() < Date.now();
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 pt-2">
        <Link to="/more">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">Pantry</h1>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">🥫</p>
          <p className="font-semibold text-lg">Pantry is empty</p>
          <p className="text-muted-foreground text-sm mb-4">Track what you have at home</p>
          <Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add first item</Button>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-3 pb-2 divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2.5">
                <span className="text-2xl">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                  {item.expires_on && (
                    <p className={`text-xs mt-0.5 ${isExpired(item.expires_on) ? 'text-destructive font-medium' : isExpiringSoon(item.expires_on) ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'}`}>
                      {isExpired(item.expires_on) ? '⚠️ Expired' : isExpiringSoon(item.expires_on) ? '⏰ Expires soon' : '📅'} {format(new Date(item.expires_on + 'T12:00:00'), 'MMM d')}
                    </p>
                  )}
                </div>
                <button onClick={() => deleteItem.mutate(item.id)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="mx-4">
          <DialogHeader><DialogTitle>Add Pantry Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="w-16">
                <Label className="text-xs">Emoji</Label>
                <Input value={newItem.emoji} onChange={(e) => setNewItem((p) => ({ ...p, emoji: e.target.value }))} className="text-center text-xl" maxLength={2} />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Item name</Label>
                <Input placeholder="Pasta, olive oil..." value={newItem.item_name} onChange={(e) => setNewItem((p) => ({ ...p, item_name: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-20">
                <Label className="text-xs">Qty</Label>
                <Input type="number" step="0.1" value={newItem.quantity} onChange={(e) => setNewItem((p) => ({ ...p, quantity: parseFloat(e.target.value) || 1 }))} />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Unit</Label>
                <Input placeholder="lb, oz, bags..." value={newItem.unit} onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Expires on (optional)</Label>
              <Input type="date" value={newItem.expires_on} onChange={(e) => setNewItem((p) => ({ ...p, expires_on: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="flex-1" disabled={!newItem.item_name.trim() || addItem.isPending} onClick={() => addItem.mutate()}>Add to Pantry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pb-2" />
    </div>
  );
}
