import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Plus, X, Moon, Sun, LogOut, Copy, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useFamilyStore } from '@/store/familyStore';
import { toast } from '@/hooks/use-toast';
import type { FamilyMember } from '@/types/database';

type MemberDraft = {
  name: string; role: 'adult' | 'kid'; portion_multiplier: number;
  emoji: string; protein_target_g: number | null;
};

const EMPTY_MEMBER: MemberDraft = {
  name: '', role: 'adult', portion_multiplier: 1.0, emoji: '👤', protein_target_g: null,
};

export default function SettingsPage() {
  const familyId = useFamilyStore((s) => s.familyId);
  const familyCode = useFamilyStore((s) => s.familyCode);
  const darkMode = useFamilyStore((s) => s.darkMode);
  const toggleDarkMode = useFamilyStore((s) => s.toggleDarkMode);
  const logout = useFamilyStore((s) => s.logout);
  const queryClient = useQueryClient();

  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<FamilyMember | null>(null);
  const [memberDraft, setMemberDraft] = useState<MemberDraft>(EMPTY_MEMBER);
  const [exclusionInput, setExclusionInput] = useState('');

  const { data: members = [] } = useQuery({
    queryKey: ['family_members', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase.from('family_members').select().eq('family_id', familyId!);
      return (data ?? []) as FamilyMember[];
    },
  });

  const { data: exclusions = [] } = useQuery({
    queryKey: ['exclusions', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase.from('exclusions').select().eq('family_id', familyId!);
      return data ?? [];
    },
  });

  const saveMember = useMutation({
    mutationFn: async () => {
      if (editMember) {
        const { error } = await supabase.from('family_members').update({
          name: memberDraft.name, role: memberDraft.role,
          portion_multiplier: memberDraft.portion_multiplier,
          emoji: memberDraft.emoji, protein_target_g: memberDraft.protein_target_g,
        }).eq('id', editMember.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('family_members').insert({ family_id: familyId!, ...memberDraft });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_members', familyId] });
      closeDialog();
      toast({ title: editMember ? 'Member updated! ✓' : 'Member added!' });
    },
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('family_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_members', familyId] });
      closeDialog();
    },
  });

  const addExclusion = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('exclusions').insert({ family_id: familyId!, ingredient_name: name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exclusions', familyId] });
      setExclusionInput('');
    },
  });

  const deleteExclusion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exclusions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exclusions', familyId] }),
  });

  function openAdd() { setEditMember(null); setMemberDraft(EMPTY_MEMBER); setMemberDialogOpen(true); }
  function openEdit(m: FamilyMember) {
    setEditMember(m);
    setMemberDraft({ name: m.name, role: m.role, portion_multiplier: m.portion_multiplier, emoji: m.emoji, protein_target_g: m.protein_target_g });
    setMemberDialogOpen(true);
  }
  function closeDialog() { setMemberDialogOpen(false); setEditMember(null); setMemberDraft(EMPTY_MEMBER); }

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 pt-2">
        <Link to="/more">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Family Code */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Family Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold tracking-widest text-primary flex-1">{familyCode}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(familyCode ?? '');
                toast({ title: 'Copied!' });
              }}
            >
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Share this with your spouse to join the family.</p>
        </CardContent>
      </Card>

      {/* Family Members */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Family Members</CardTitle>
            <Button size="sm" variant="ghost" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <span className="text-2xl">{m.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {m.role} · {m.portion_multiplier}× portion
                  {m.protein_target_g ? ` · ${m.protein_target_g}g protein` : ''}
                </p>
              </div>
              <button
                onClick={() => openEdit(m)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground">No members yet</p>
          )}
        </CardContent>
      </Card>

      {/* Exclusions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ingredient Exclusions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. shellfish, peanuts"
              value={exclusionInput}
              onChange={(e) => setExclusionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && exclusionInput.trim()) {
                  addExclusion.mutate(exclusionInput.trim());
                }
              }}
            />
            <Button variant="outline" onClick={() => exclusionInput.trim() && addExclusion.mutate(exclusionInput.trim())}>
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {exclusions.map((ex) => (
              <div key={ex.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm">
                <span>{ex.ingredient_name}</span>
                <button onClick={() => deleteExclusion.mutate(ex.id)}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {exclusions.length === 0 && (
              <p className="text-sm text-muted-foreground">No exclusions yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="text-sm font-medium">Dark Mode</span>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full text-destructive hover:bg-destructive/10 border-destructive/30"
        onClick={() => {
          if (confirm('Sign out of this device? You can rejoin with your family code.')) {
            logout();
          }
        }}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out (This Device)
      </Button>

      {/* Add / Edit Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>{editMember ? 'Edit Family Member' : 'Add Family Member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="w-16">
                <Label className="text-xs">Emoji</Label>
                <Input
                  value={memberDraft.emoji}
                  onChange={(e) => setMemberDraft((p) => ({ ...p, emoji: e.target.value }))}
                  className="text-center text-xl"
                  maxLength={2}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Name</Label>
                <Input
                  placeholder="Name"
                  value={memberDraft.name}
                  onChange={(e) => setMemberDraft((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <div className="flex gap-2 mt-1">
                {(['adult', 'kid'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setMemberDraft((p) => ({ ...p, role: r }))}
                    className={`flex-1 py-2 rounded-lg border text-sm capitalize transition-colors ${memberDraft.role === r ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                  >
                    {r === 'adult' ? '👨 Adult' : '🧒 Kid'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Portion multiplier</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="3"
                value={memberDraft.portion_multiplier}
                onChange={(e) => setMemberDraft((p) => ({ ...p, portion_multiplier: parseFloat(e.target.value) || 1 }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Adults: 1.0–1.5 · Kids: 0.5</p>
            </div>
            {memberDraft.role === 'adult' && (
              <div>
                <Label className="text-xs">Daily protein target (g, optional)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 160"
                  value={memberDraft.protein_target_g ?? ''}
                  onChange={(e) => setMemberDraft((p) => ({ ...p, protein_target_g: e.target.value ? parseInt(e.target.value) : null }))}
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex-row gap-2">
            {editMember && (
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => { if (confirm('Remove this member?')) deleteMember.mutate(editMember.id); }}
                disabled={deleteMember.isPending}
              >
                Remove
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={closeDialog}>Cancel</Button>
            <Button className="flex-1" disabled={!memberDraft.name.trim() || saveMember.isPending} onClick={() => saveMember.mutate()}>
              {editMember ? 'Save Changes' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pb-2" />
    </div>
  );
}
