'use client';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navigation / Mobile Header could go here */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex items-center justify-between">
          <div className="font-bold text-teal-700 text-lg tracking-tight">REGINA</div>
          <button className="text-slate-500 hover:text-teal-600">
            {/* Hamburger Icon */}
          </button>
        </header>
        
        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar relative">
          {children}
        </div>
      </main>
    </div>
  );
}
