import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Users, Plus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useFamilyStore } from '@/store/familyStore';
import { toast } from '@/hooks/use-toast';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const joinSchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be 6 characters')
    .max(6, 'Code must be 6 characters')
    .transform((v) => v.toUpperCase()),
});

type JoinForm = z.infer<typeof joinSchema>;

export default function FamilyCodePage() {
  const [view, setView] = useState<'home' | 'create' | 'join'>('home');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setFamily = useFamilyStore((s) => s.setFamily);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<JoinForm>({ resolver: zodResolver(joinSchema) });

  async function handleCreate() {
    setLoading(true);
    try {
      const code = generateCode();
      const { data, error } = await supabase
        .from('families')
        .insert({ code })
        .select()
        .single();

      if (error) throw error;

      // Seed default family members
      await supabase.from('family_members').insert([
        { family_id: data.id, name: 'Deyvis', role: 'adult', portion_multiplier: 1.5, emoji: '👨' },
        { family_id: data.id, name: 'Wife', role: 'adult', portion_multiplier: 1.0, emoji: '👩' },
        { family_id: data.id, name: 'Kid 1', role: 'kid', portion_multiplier: 0.5, emoji: '🧒' },
        { family_id: data.id, name: 'Kid 2', role: 'kid', portion_multiplier: 0.5, emoji: '👶' },
      ]);

      setCreatedCode(code);
      setFamily(data.id, code);
    } catch (err) {
      toast({ title: 'Error creating family', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(values: JoinForm) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('families')
        .select()
        .eq('code', values.code)
        .single();

      if (error || !data) {
        setError('code', { message: 'Family code not found. Double-check and try again.' });
        return;
      }

      setFamily(data.id, data.code);
      toast({ title: '🎉 Welcome to the family!', variant: 'default' });
      navigate('/', { replace: true });
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  if (createdCode) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-6 animate-fade-in">
          <div className="text-6xl">🎉</div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your family is ready!</h1>
            <p className="text-muted-foreground mt-2">Share this code with your spouse so they can join.</p>
          </div>
          <Card className="border-2 border-primary/30">
            <CardContent className="pt-6 pb-6">
              <p className="text-sm text-muted-foreground mb-2">Family Code</p>
              <p className="text-5xl font-bold tracking-[0.4em] text-primary">{createdCode}</p>
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground">
            Your spouse opens Family Meal OS on their phone → taps "Join Family" → enters this code.
          </p>
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate('/', { replace: true })}
          >
            Let's go! <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        {/* Logo / header */}
        <div className="text-center space-y-2">
          <div className="text-7xl">🍽️</div>
          <h1 className="text-3xl font-bold text-foreground">Family Meal OS</h1>
          <p className="text-muted-foreground">Your family's kitchen command center</p>
        </div>

        {view === 'home' && (
          <div className="space-y-3">
            <Button size="lg" className="w-full" onClick={() => setView('create')}>
              <Plus className="mr-2 h-5 w-5" />
              Create a new family
            </Button>
            <Button size="lg" variant="outline" className="w-full" onClick={() => setView('join')}>
              <Users className="mr-2 h-5 w-5" />
              Join with a family code
            </Button>
          </div>
        )}

        {view === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>Create your family</CardTitle>
              <CardDescription>We'll generate a 6-character code your spouse can use to join.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button size="lg" className="w-full" onClick={handleCreate} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : '🚀 '}
                {loading ? 'Creating...' : 'Create Family'}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setView('home')}>
                Back
              </Button>
            </CardContent>
          </Card>
        )}

        {view === 'join' && (
          <Card>
            <CardHeader>
              <CardTitle>Join your family</CardTitle>
              <CardDescription>Enter the 6-character code your spouse shared with you.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleJoin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Family Code</Label>
                  <Input
                    id="code"
                    placeholder="BEAR42"
                    className="text-center text-2xl font-bold tracking-widest uppercase h-14"
                    maxLength={6}
                    {...register('code')}
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code.message}</p>
                  )}
                </div>
                <Button size="lg" type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {loading ? 'Joining...' : 'Join Family'}
                </Button>
                <Button variant="ghost" className="w-full" type="button" onClick={() => setView('home')}>
                  Back
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
