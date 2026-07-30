import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TopNavbar from '../components/layout/TopNavbar';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
      <Sidebar />
      <TopNavbar />
      <main className="min-h-screen pt-20 lg:pl-[280px]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}