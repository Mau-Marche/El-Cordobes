import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/toast';
import { useAuthStore } from '@/store/authStore';

export function AppLayout() {
  const { token } = useAuthStore();

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
