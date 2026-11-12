'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { X, User, LogOut } from 'lucide-react';
import { SidebarNav } from '@/components/Sidebar';
import { useAuth, isKoperasi } from '@/context/AuthContext';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

/** Laci navigasi untuk layar kecil: menu yang sama dengan sidebar desktop, plus Profil dan Keluar. */
export default function MobileNav({ open, onClose }: MobileNavProps) {
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflowSebelumnya = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // halaman di belakang laci tidak ikut tergulir
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowSebelumnya;
    };
  }, [open, onClose]);

  if (!open) return null;

  const koperasi = isKoperasi(user);
  const nama = user?.first_name || user?.username || 'Guest';
  const peran = user?.is_superuser ? 'Superadmin' : koperasi ? 'Akun Koperasi Desa' : 'Admin Daerah';

  return (
    <div className="md:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl flex flex-col"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <img src="/logo/LOGO REGINA 2.png" alt="REGINA Logo" className="h-9 w-auto object-contain" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <SidebarNav onNavigate={onClose} />

        <div className="border-t border-slate-100 p-4 flex flex-col gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-800 truncate">{nama}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email || 'No email set'}</div>
            <div className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold mt-2 w-fit">{peran}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Link
              href="/dashboard/profil"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg font-medium"
            >
              <User size={16} className="text-slate-400" />
              Profil Akun
            </Link>
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 rounded-lg font-semibold cursor-pointer text-left"
            >
              <LogOut size={16} className="text-rose-500" />
              Keluar (Logout)
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
