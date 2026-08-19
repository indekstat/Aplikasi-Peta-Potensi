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
    { name: 'Lihat PDRB Provinsi', href: '/dashboard/pdrb-provinsi', icon: <PieChart size={20} /> },
    { name: 'Input Data Analisa', href: '/dashboard/analisa', icon: <FileText size={20} /> },
    { name: 'Daftar Komoditas', href: '/dashboard/komoditas-admin', icon: <List size={20} /> },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col shadow-sm hidden md:flex">
      <div className="p-5 border-b border-slate-100 flex items-center justify-center">
        <img
          src="/logo/LOGO REGINA 2.png"
          alt="REGINA Logo"
          className="h-11 w-auto object-contain"
        />
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

      
    </aside>
  );
}
