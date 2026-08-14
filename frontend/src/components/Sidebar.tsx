'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, BarChart3, PieChart, Home, Layers, Settings, FileText, User, LogOut, Database, List } from 'lucide-react';
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const publicMenuItems = [
    { name: 'Beranda', href: '/dashboard', icon: <Home size={20} /> },
    { name: 'Potensi Unggulan', href: '/dashboard/potensi', icon: <BarChart3 size={20} /> },
    { name: 'Komoditas Unggulan', href: '/dashboard/komoditas', icon: <Layers size={20} /> },
  ];

  const authMenuItems = [
    { name: 'Input Data Analisa', href: '/dashboard/analisa', icon: <FileText size={20} /> },
    { name: 'Lihat PDRB Provinsi', href: '/dashboard/pdrb-provinsi', icon: <PieChart size={20} /> },
    { name: 'Daftar Komoditas', href: '/dashboard/komoditas-admin', icon: <List size={20} /> },
    { name: 'Profil Akun', href: '/dashboard/profil', icon: <User size={20} /> },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col shadow-sm hidden md:flex">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center text-white">
          <Map size={18} />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-xl leading-tight tracking-tight">REGINA</h1>
          <span className="text-[9px] text-slate-500 font-medium leading-none block mt-1">Regional Intelligence Analytics</span>
          <span className="text-[9px] text-teal-600 font-bold block mt-0.5 tracking-wider">BY INDEKSTAT</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 px-2">Menu Analisis</div>
        {publicMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}

        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 mt-4 px-2">Manajemen Data</div>
        {authMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}

        {user?.is_superuser && (
          <>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 mt-4 px-2">Superadmin</div>
            <Link 
              href="/dashboard/monitoring"
              className={`sidebar-link ${pathname === '/dashboard/monitoring' ? 'active' : ''}`}
            >
              <Database size={20} />
              Monitoring Data
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="text-sm font-bold text-slate-800 truncate mb-1" title={user?.username || 'Guest'}>
            {user?.first_name || user?.username || 'Guest'}
          </div>
          <div className="text-xs text-slate-500 mb-3 truncate" title={user?.is_superuser ? 'Administrator' : (user?.profile?.asal_provinsi || 'Belum Login')}>
            {user?.is_superuser ? 'Administrator' : (user?.profile?.asal_provinsi || 'Belum Login')}
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-rose-600 text-sm font-semibold rounded-lg hover:bg-rose-50 hover:border-rose-200 transition-colors"
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </div>
    </aside>
  );
}
