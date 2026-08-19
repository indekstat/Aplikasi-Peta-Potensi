'use client';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { User, LogOut, ChevronDown } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Navigation (Desktop & Mobile) */}
        <header className="bg-white border-b border-slate-200 h-16 sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between shrink-0 shadow-sm">
          {/* Left side: Mobile logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo/LOGO REGINA 2.png"
              alt="REGINA Logo"
              className="h-8 w-auto object-contain md:hidden"
            />
          </div>

          {/* Right side: User Dropdown / Profile Menu */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="relative group">
              <button className="flex items-center gap-3 hover:bg-slate-50 p-1.5 md:p-2 rounded-xl border border-transparent hover:border-slate-100 transition-all text-left cursor-pointer">
                <div className="w-8 h-8 md:w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border border-teal-200 text-xs md:text-sm shrink-0">
                  {user?.first_name ? user.first_name.substring(0, 2).toUpperCase() : (user?.username ? user.username.substring(0, 2).toUpperCase() : 'US')}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-bold text-slate-800 leading-tight">
                    {user?.first_name || user?.username || 'Guest'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">
                    {user?.is_superuser ? 'Seluruh Indonesia (Superadmin)' : (user?.profile?.asal_kokab || user?.profile?.asal_provinsi || 'Daerah')}
                  </div>
                </div>
                <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              </button>

              {/* Hover Dropdown card */}
              <div className="absolute right-0 top-full mt-1 w-60 bg-white border border-slate-100 rounded-xl shadow-xl py-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
                <div className="px-4 py-3 border-b border-slate-50">
                  <div className="text-sm font-bold text-slate-800 truncate">
                    {user?.first_name || user?.username || 'Guest'}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {user?.email || 'No email set'}
                  </div>
                  <div className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold mt-2 w-fit">
                    {user?.is_superuser ? 'Superadmin' : 'Admin Daerah'}
                  </div>
                </div>
                <div className="p-1">
                  <Link
                    href="/dashboard/profil"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-medium"
                  >
                    <User size={16} className="text-slate-400" />
                    Profil Akun
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-semibold cursor-pointer text-left"
                  >
                    <LogOut size={16} className="text-rose-500" />
                    Keluar (Logout)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar relative">
          {children}
        </div>
      </main>
    </div>
  );
}
