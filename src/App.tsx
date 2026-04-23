import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Toaster } from '@/components/ui/toaster';
import { useFamilyStore } from '@/store/familyStore';
import { Skeleton } from '@/components/ui/skeleton';

const FamilyCodePage = lazy(() => import('@/pages/auth/FamilyCodePage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const PlanPage = lazy(() => import('@/pages/plan/PlanPage'));
const ShopPage = lazy(() => import('@/pages/shop/ShopPage'));
const RecipesPage = lazy(() => import('@/pages/recipes/RecipesPage'));
const TakeoutPage = lazy(() => import('@/pages/takeout/TakeoutPage'));
const MorePage = lazy(() => import('@/pages/more/MorePage'));
const SettingsPage = lazy(() => import('@/pages/more/SettingsPage'));
const PantryPage = lazy(() => import('@/pages/more/PantryPage'));
const KidFoodLogPage = lazy(() => import('@/pages/more/KidFoodLogPage'));
const PhotosPage = lazy(() => import('@/pages/more/PhotosPage'));
const FeedbackHistoryPage = lazy(() => import('@/pages/more/FeedbackHistoryPage'));
const TakeoutHistoryPage = lazy(() => import('@/pages/more/TakeoutHistoryPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const familyId = useFamilyStore((s) => s.familyId);
  if (!familyId) return <Navigate to="/join" replace />;
  return <>{children}</>;
}

export default function App() {
  const { initFromStorage } = useFamilyStore();

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/join" element={<FamilyCodePage />} />
            <Route
              element={
                <AuthGate>
                  <AppLayout />
                </AuthGate>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/plan" element={<PlanPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/recipes" element={<RecipesPage />} />
              <Route path="/takeout" element={<TakeoutPage />} />
              <Route path="/more" element={<MorePage />} />
              <Route path="/more/settings" element={<SettingsPage />} />
              <Route path="/more/pantry" element={<PantryPage />} />
              <Route path="/more/kid-log" element={<KidFoodLogPage />} />
              <Route path="/more/photos" element={<PhotosPage />} />
              <Route path="/more/feedback" element={<FeedbackHistoryPage />} />
              <Route path="/more/takeout-history" element={<TakeoutHistoryPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
