import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useFamilyStore } from '@/store/familyStore';
import type { Feedback } from '@/types/database';

export default function FeedbackHistoryPage() {
  const familyId = useFamilyStore((s) => s.familyId);

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['feedback', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data } = await supabase.from('feedback').select().eq('family_id', familyId!).order('created_at', { ascending: false });
      return (data ?? []) as Feedback[];
    },
  });

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 pt-2">
        <Link to="/more"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-bold">Feedback History</h1>
      </div>

      {feedbacks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">⭐</p>
          <p className="font-semibold">No ratings yet</p>
          <p className="text-sm text-muted-foreground mt-2">Rate your meals from the Plan screen</p>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-3 pb-2 divide-y divide-border">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < fb.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(fb.created_at), 'MMM d')}</span>
                </div>
                {fb.note && <p className="text-sm mt-1 text-muted-foreground">{fb.note}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="pb-2" />
    </div>
  );
}
