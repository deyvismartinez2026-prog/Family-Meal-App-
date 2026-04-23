import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PhotosPage() {
  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 pt-2">
        <Link to="/more"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-bold">Meal Photos</h1>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-6xl mb-4">📸</p>
        <p className="font-semibold text-lg">Meal photos coming soon</p>
        <p className="text-muted-foreground text-sm mt-2">Phase 5 — photo upload via Supabase Storage</p>
      </div>
    </div>
  );
}
