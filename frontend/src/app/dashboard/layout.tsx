'use client';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, isKoperasi, HOME_KOPERASI, MENU_KOPERASI } from '@/context/AuthContext';
import Link from 'next/link';
import { User, LogOut, ChevronDown, Menu } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false); // laci navigasi (layar kecil)
  const [akunOpen, setAkunOpen] = useState(false); // menu akun di header
  const akunRef = useRef<HTMLDivElement>(null);

  // Pindah halaman menutup laci dan menu akun.
  useEffect(() => {
    setMenuOpen(false);
    setAkunOpen(false);
  }, [pathname]);

  // Menu akun terbuka lewat ketuk/klik (hover tidak ada di layar sentuh); tutup saat klik di luar atau Escape.
  useEffect(() => {
    if (!akunOpen) return;
    const luar = (e: MouseEvent | TouchEvent) => {
      if (akunRef.current && !akunRef.current.contains(e.target as Node)) setAkunOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAkunOpen(false);
    };
    document.addEventListener('mousedown', luar);
    document.addEventListener('touchstart', luar);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', luar);
      document.removeEventListener('touchstart', luar);
      document.removeEventListener('keydown', esc);
    };
  }, [akunOpen]);

  // Akun koperasi desa hanya punya dua menu (+ profil); halaman analisis daerah dialihkan.
  const koperasi = isKoperasi(user);
  const dilarang = koperasi && !MENU_KOPERASI.includes(pathname);
  useEffect(() => {
    if (dilarang) router.replace(HOME_KOPERASI);
  }, [dilarang, router]);

  const lokasi = user?.is_superuser
    ? 'Seluruh Indonesia (Superadmin)'
    : koperasi
      ? [user?.profile?.desa?.nama_desa, user?.profile?.desa?.nama_kab].filter(Boolean).join(', ') || 'Koperasi Desa'
      : (user?.profile?.asal_kokab || user?.profile?.asal_provinsi || 'Daerah');

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="flex-1 min-w-0 flex flex-col h-dvh overflow-hidden">
        {/* Top Header Navigation (Desktop & Mobile) */}
        <header className="bg-white border-b border-slate-200 h-16 sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between shrink-0 shadow-sm">
          {/* Left side: tombol menu + logo (layar kecil) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Buka menu"
              aria-expanded={menuOpen}
              className="md:hidden -ml-2 p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu size={22} />
            </button>
            <img
              src="/logo/LOGO REGINA 2.png"
              alt="REGINA Logo"
              className="h-8 w-auto object-contain md:hidden"
            />
          </div>

          {/* Right side: User Dropdown / Profile Menu */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="relative" ref={akunRef}>
              <button
                type="button"
                onClick={() => setAkunOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={akunOpen}
                aria-label="Menu akun"
                className="flex items-center gap-3 hover:bg-slate-50 p-1.5 md:p-2 rounded-xl border border-transparent hover:border-slate-100 transition-all text-left cursor-pointer"
              >
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border border-teal-200 text-xs md:text-sm shrink-0">
                  {user?.first_name ? user.first_name.substring(0, 2).toUpperCase() : (user?.username ? user.username.substring(0, 2).toUpperCase() : 'US')}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-bold text-slate-800 leading-tight">
                    {user?.first_name || user?.username || 'Guest'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">
                    {lokasi}
                  </div>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${akunOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Menu akun (buka/tutup lewat klik) */}
              <div
                role="menu"
                className={`absolute right-0 top-full mt-1 w-60 max-w-[calc(100vw-2rem)] bg-white border border-slate-100 rounded-xl shadow-xl py-2 transition-all duration-200 z-50 ${akunOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}
              >
                <div className="px-4 py-3 border-b border-slate-50">
                  <div className="text-sm font-bold text-slate-800 truncate">
                    {user?.first_name || user?.username || 'Guest'}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {user?.email || 'No email set'}
                  </div>
                  <div className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold mt-2 w-fit">
                    {user?.is_superuser ? 'Superadmin' : koperasi ? 'Akun Koperasi Desa' : 'Admin Daerah'}
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
          {dilarang ? null : children}
        </div>
      </main>
    </div>
  );
}
