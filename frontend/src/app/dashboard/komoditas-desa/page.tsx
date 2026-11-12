"use client";

import { useEffect, useState } from "react";
import { Sprout, Factory, Briefcase, Tractor, MapPin, Boxes } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DesaPicker } from "@/components/DesaPicker";

interface DataDesa {
  tahun: number;
  desa: { iddesa: string; nama_desa: string; nama_kec: string; nama_kab: string; nama_prov: string };
  r906: {
    lapangan_usaha: { kode: number; label: string } | null;
    sub_sektor: { kode: number; label: string } | null;
    komoditas_utama: { kode: number; nama: string } | null;
  };
  r907: {
    jumlah_industri_mikro_kecil: number;
    jumlah_sentra_industri: number;
    produk_sentra_industri: string | null;
  };
}

const nf = new Intl.NumberFormat("id-ID");

function Kartu({ ikon, judul, nilai, catatan }: { ikon: React.ReactNode; judul: string; nilai: React.ReactNode; catatan?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
        {ikon}
        {judul}
      </div>
      <div className="text-xl font-bold text-slate-800 break-words">{nilai}</div>
      {catatan && <p className="text-xs text-slate-500">{catatan}</p>}
    </div>
  );
}

export default function KomoditasDesaPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const superadmin = !!user?.is_superuser;
  // Superadmin memilih desa sendiri; akun koperasi otomatis melihat desanya.
  const [desaId, setDesaId] = useState("");
  const [data, setData] = useState<DataDesa | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (superadmin && !desaId) {
      setData(null);
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const token = localStorage.getItem("access_token");
    const query = superadmin ? `?desa_id=${encodeURIComponent(desaId)}` : "";
    fetch(`/api/koperasi/komoditas-unggulan${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (res) => {
        if (res.status === 401) {
          logout();
          return;
        }
        if (res.status === 403) {
          setError("Halaman ini hanya untuk akun koperasi desa dan superadmin.");
          return;
        }
        if (!res.ok) throw new Error();
        setData(await res.json());
      })
      .catch(() => setError("Gagal memuat data desa. Coba muat ulang halaman."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, superadmin, desaId]);

  const pemilih = superadmin ? (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-2">
      <p className="text-sm font-semibold text-slate-700">Pilih desa yang ingin dilihat</p>
      <DesaPicker onChange={setDesaId} />
    </div>
  ) : null;

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-white border border-slate-200" />;
  if (superadmin && !desaId)
    return (
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-slate-800">Komoditas Unggulan Desa</h1>
        {pemilih}
        <p className="text-sm text-slate-500">Pilih provinsi sampai desa untuk melihat data Podes desa tersebut.</p>
      </div>
    );
  if (error || !data)
    return (
      <div className="max-w-5xl mx-auto flex flex-col gap-4">
        {pemilih}
        <p className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700">{error || "Data tidak tersedia."}</p>
      </div>
    );

  const { desa, r906, r907 } = data;
  const pertanian = r906.lapangan_usaha?.kode === 1;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {pemilih}
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Komoditas Unggulan Desa</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin size={14} />
          {desa.nama_desa}, Kec. {desa.nama_kec}, {desa.nama_kab}, {desa.nama_prov}
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-slate-700">Sumber penghasilan utama penduduk</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Kartu
            ikon={<Briefcase size={14} />}
            judul="Lapangan usaha utama"
            nilai={r906.lapangan_usaha?.label ?? "-"}
            catatan="Lapangan usaha sebagian besar penduduk desa"
          />
          <Kartu
            ikon={<Tractor size={14} />}
            judul="Sub sektor utama"
            nilai={r906.sub_sektor?.label ?? "-"}
            catatan={pertanian ? undefined : "Hanya untuk desa yang bersumber dari pertanian"}
          />
          <Kartu
            ikon={<Sprout size={14} />}
            judul="Komoditas utama"
            nilai={r906.komoditas_utama?.nama ?? "-"}
            catatan={
              r906.komoditas_utama
                ? `Kode komoditas Podes ${r906.komoditas_utama.kode}`
                : pertanian
                  ? "Tidak ada komoditas utama yang tercatat"
                  : "Hanya untuk desa yang bersumber dari pertanian"
            }
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-slate-700">Industri mikro dan kecil</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Kartu
            ikon={<Factory size={14} />}
            judul="Industri mikro dan kecil"
            nilai={nf.format(r907.jumlah_industri_mikro_kecil)}
            catatan="Usaha dengan tenaga kerja kurang dari 20 orang"
          />
          <Kartu ikon={<Boxes size={14} />} judul="Sentra industri" nilai={nf.format(r907.jumlah_sentra_industri)} catatan="Jumlah lokasi sentra" />
          <Kartu
            ikon={<Boxes size={14} />}
            judul="Produk sentra industri"
            nilai={r907.produk_sentra_industri ?? "-"}
            catatan="Produk dengan muatan usaha terbanyak"
          />
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Sumber: Pendataan Potensi Desa (Podes) {data.tahun}, BPS, blok 906 dan 907.
      </p>
    </div>
  );
}
