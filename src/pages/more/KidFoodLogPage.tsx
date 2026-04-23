import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useFamilyStore } from '@/store/familyStore';
import { toast } from '@/hooks/use-toast';
import type { KidFoodLog, FamilyMember, Acceptance } from '@/types/database';

const ACCEPTANCE_OPTIONS: { value: Acceptance; label: string; emoji: string }[] = [
  { value: 'loved', label: 'Loved it!', emoji: '😍' },
  { value: 'ate', label: 'Ate it', emoji: '😊' },
  { value: 'rejected', label: 'Rejected', emoji: '😤' },
  { value: 'spat', label: 'Spat it out', emoji: '🤢' },
];

export default function KidFoodLogPage() {
  const familyId = useFamilyStore((s) => s.familyId);
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    kid_member_id: '',
    food_name: '',
    date_tried: format(new Date(), 'yyyy-MM-dd'),
    acceptance: 'ate' as Acceptance,
    retry_queue: false,
  });

  const { data: kids = [] } = useQuery({
    queryKey: ['family_members', familyId, 'kids'],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase.from('family_members').select().eq('family_id', familyId!).eq('role', 'kid');
      return (data ?? []) as FamilyMember[];
    },
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['kid_food_log', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase.from('kid_food_log').select().eq('family_id', familyId!).order('date_tried', { ascending: false });
      return (data ?? []) as KidFoodLog[];
    },
  });

  const addLog = useMutation({
    mutationFn: async () => {
      if (!newEntry.kid_member_id) throw new Error('Select a kid');
      const { error } = await supabase.from('kid_food_log').insert({ family_id: familyId!, ...newEntry });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kid_food_log', familyId] });
      setAddOpen(false);
      setNewEntry({ kid_member_id: '', food_name: '', date_tried: format(new Date(), 'yyyy-MM-dd'), acceptance: 'ate', retry_queue: false });
      toast({ title: 'Food log added! 🧒' });
    },
    onError: (e) => toast({ title: 'Error', description: String(e), variant: 'destructive' }),
  });

  const retryQueue = logs.filter((l) => l.retry_queue);
  const recentLogs = logs.filter((l) => !l.retry_queue);

  function getKidName(id: string) {
    return kids.find((k) => k.id === id)?.name ?? 'Kid';
  }

  function getKidEmoji(id: string) {
    return kids.find((k) => k.id === id)?.emoji ?? '🧒';
  }

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 pt-2">
        <Link to="/more"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-bold">Kid Food Log</h1>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" /> Log</Button>
        </div>
      </div>

      {retryQueue.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">🔁 Try Again Queue</h2>
          <Card>
            <CardContent className="pt-3 pb-2 divide-y divide-border">
              {retryQueue.map((log) => {
                const opt = ACCEPTANCE_OPTIONS.find((o) => o.value === log.acceptance);
                return (
                  <div key={log.id} className="flex items-center gap-3 py-2.5">
                    <span className="text-xl">{getKidEmoji(log.kid_member_id)}</span>
                    <div className="flex-1">
                      <p className="font-medium">{log.food_name}</p>
                      <p className="text-xs text-muted-foreground">{getKidName(log.kid_member_id)} · {format(new Date(log.date_tried + 'T12:00:00'), 'MMM d')}</p>
                    </div>
                    <span className="text-lg">{opt?.emoji}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">📋 Food Log</h2>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : recentLogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-3">🧒</p>
            <p className="font-semibold">No food log yet</p>
            <p className="text-sm text-muted-foreground mb-4">Track new foods the kids try!</p>
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add first entry</Button>
          </div>
        ) : (
          <Card>
            <CardContent className="pt-3 pb-2 divide-y divide-border">
              {recentLogs.map((log) => {
                const opt = ACCEPTANCE_OPTIONS.find((o) => o.value === log.acceptance);
                return (
                  <div key={log.id} className="flex items-center gap-3 py-2.5">
                    <span className="text-xl">{getKidEmoji(log.kid_member_id)}</span>
                    <div className="flex-1">
                      <p className="font-medium">{log.food_name}</p>
                      <p className="text-xs text-muted-foreground">{getKidName(log.kid_member_id)} · {format(new Date(log.date_tried + 'T12:00:00'), 'MMM d')}</p>
                    </div>
                    <span className="text-lg">{opt?.emoji}</span>
                    <span className="text-xs text-muted-foreground">{opt?.label}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="mx-4">
          <DialogHeader><DialogTitle>Log a New Food</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Which kid?</Label>
              <div className="flex gap-2 mt-1">
                {kids.map((k) => (
                  <button key={k.id} onClick={() => setNewEntry((p) => ({ ...p, kid_member_id: k.id }))}
                    className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${newEntry.kid_member_id === k.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                    {k.emoji} {k.name}
                  </button>
                ))}
                {kids.length === 0 && <p className="text-sm text-muted-foreground">Add kids in Settings first</p>}
              </div>
            </div>
            <div>
              <Label className="text-xs">Food name</Label>
              <Input placeholder="Broccoli, salmon..." value={newEntry.food_name} onChange={(e) => setNewEntry((p) => ({ ...p, food_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Date tried</Label>
              <Input type="date" value={newEntry.date_tried} onChange={(e) => setNewEntry((p) => ({ ...p, date_tried: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Reaction</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {ACCEPTANCE_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setNewEntry((p) => ({ ...p, acceptance: opt.value }))}
                    className={`py-2.5 px-3 rounded-xl border text-sm flex items-center gap-2 transition-colors ${newEntry.acceptance === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                    <span className="text-lg">{opt.emoji}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="flex-1" disabled={!newEntry.food_name.trim() || !newEntry.kid_member_id || addLog.isPending} onClick={() => addLog.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pb-2" />
    </div>
  );
}
