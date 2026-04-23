import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto bg-background">
      <main className="flex-1 overflow-y-auto pb-[76px]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
