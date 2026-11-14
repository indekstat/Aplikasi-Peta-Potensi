"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertCircle, ArrowDown, ArrowUp, Banknote, Building2, Info, Landmark, Search, Users, Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface Rincian { nama: string; koperasi: number; aktif: number; anggota: number; kdkmp?: boolean }
interface BarisWilayah {
  kode: string; nama: string; koperasi: number; aktif: number; kdkmp: number; reguler: number;
  anggota: number; persen_kdkmp: number | null;
}
interface Overview {
  kosong?: boolean;
  tahun: number;
  tahun_tersedia: number[];
  lingkup: { tingkat: "nasional" | "provinsi" | "kabupaten"; prov: { kode: string; nama: string } | null; kab: { kode: string; nama: string } | null };
  kpi: {
    koperasi: number; aktif: number; tidak_aktif: number; persen_aktif: number | null; anggota: number; tenaga_kerja: number;
    kdkmp: number; kdkmp_desa: number; kdkmp_kelurahan: number; kdkmp_aktif: number; persen_kdkmp: number | null;
    reguler: number; reguler_aktif: number; aset: number; volume_usaha: number; shu: number; bersertifikat: number; sudah_rat: number;
  };
  tren: { tahun: number; koperasi: number; aktif: number; kdkmp: number; reguler: number }[];
  jenis: Rincian[];
  bentuk: Rincian[];
  sektor: Rincian[];
  kelompok: Rincian[];
  kelompok_lainnya: number;
  wilayah: { tingkat: "provinsi" | "kabupaten"; baris: BarisWilayah[] };
  opsi: { provinsi: { kode: string; nama: string }[]; kabupaten: { kode: string; nama: string }[] };
}

const nf = new Intl.NumberFormat("id-ID");
const nf1 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

function rupiah(n: number) {
  if (!n) return "Rp 0";
  if (n >= 1e12) return `Rp ${nf1.format(n / 1e12)} triliun`;
  if (n >= 1e9) return `Rp ${nf1.format(n / 1e9)} miliar`;
  if (n >= 1e6) return `Rp ${nf1.format(n / 1e6)} juta`;
  return `Rp ${nf.format(n)}`;
}

function persen(n: number | null) {
  return n === null ? "-" : `${nf1.format(n)}%`;
}

function Kartu({ ikon, judul, nilai, catatan, aksen }: {
  ikon: React.ReactNode; judul: string; nilai: React.ReactNode; catatan?: React.ReactNode; aksen?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-2 ${aksen ?? "border-slate-200"}`}>
      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
        {ikon}
        {judul}
      </div>
      <div className="text-2xl font-bold text-slate-800 break-words">{nilai}</div>
      {catatan && <div className="text-xs text-slate-500">{catatan}</div>}
    </div>
  );
}

function Panel({ judul, catatan, children }: { judul: string; catatan?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-base font-bold text-slate-800">{judul}</h2>
      {catatan && <p className="text-xs text-slate-500 mt-0.5">{catatan}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Peringkat berupa batang horizontal (CSS), supaya label panjang tetap terbaca di layar kecil. */
function Peringkat({ data, kosong = "Belum ada data." }: { data: Rincian[]; kosong?: string }) {
  const maks = Math.max(1, ...data.map((d) => d.koperasi));
  if (data.length === 0) return <p className="text-sm text-slate-500">{kosong}</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((d) => (
        <li key={d.nama}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className={`min-w-0 break-words ${d.kdkmp ? "font-semibold text-rose-700" : "text-slate-700"}`}>
              {d.nama}
              {d.kdkmp && <span className="ml-1.5 text-[10px] font-bold uppercase text-rose-600">KDKMP</span>}
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-slate-800">{nf.format(d.koperasi)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${d.kdkmp ? "bg-rose-500" : "bg-blue-500"}`}
              style={{ width: `${Math.max(1, (d.koperasi / maks) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

type KunciUrut = "nama" | "koperasi" | "aktif" | "kdkmp" | "reguler" | "persen_kdkmp" | "anggota";

export default function OverviewKoperasiPage() {
  const { loading: authLoading, logout } = useAuth();
  const [tahun, setTahun] = useState("");
  const [prov, setProv] = useState("");
  const [kab, setKab] = useState("");
  // Hasil terakhir beserta kunci filter yang menghasilkannya; "memuat" = kunci hasil belum sama dengan filter saat ini.
  const kunci = `${tahun}|${prov}|${kab}`;
  const [hasil, setHasil] = useState<{ kunci: string; data: Overview | null; error: string }>({ kunci: "", data: null, error: "" });
  const [cari, setCari] = useState("");
  const [urut, setUrut] = useState<{ kunci: KunciUrut; naik: boolean }>({ kunci: "koperasi", naik: false });
  const { data, error } = hasil;
  const loading = hasil.kunci !== kunci;

  useEffect(() => {
    if (authLoading) return;
    let batal = false;
    const token = localStorage.getItem("access_token");
    const q = new URLSearchParams();
    if (tahun) q.set("tahun", tahun);
    if (prov) q.set("prov", prov);
    if (kab) q.set("kab", kab);
    const selesai = (data: Overview | null, error = "") => !batal && setHasil({ kunci, data, error });
    fetch(`/api/koperasi/overview?${q}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (res) => {
        if (batal) return;
        if (res.status === 401) {
          logout();
          return;
        }
        if (res.status === 403) return selesai(null, "Halaman ini hanya untuk akun koperasi desa dan superadmin.");
        if (!res.ok) throw new Error();
        selesai(await res.json());
      })
      .catch(() => selesai(null, "Gagal memuat data koperasi. Coba lagi beberapa saat."));
    return () => {
      batal = true;
    };
  }, [authLoading, tahun, prov, kab, kunci, logout]);

  const baris = useMemo(() => {
    if (!data) return [];
    const kata = cari.trim().toLowerCase();
    const hasil = data.wilayah.baris.filter((b) => !kata || b.nama.toLowerCase().includes(kata));
    const arah = urut.naik ? 1 : -1;
    return [...hasil].sort((a, b) => {
      if (urut.kunci === "nama") return a.nama.localeCompare(b.nama, "id") * arah;
      return ((a[urut.kunci] ?? -1) - (b[urut.kunci] ?? -1)) * arah || a.nama.localeCompare(b.nama, "id");
    });
  }, [data, cari, urut]);

  const pilihProv = (kode: string) => {
    setProv(kode);
    setKab("");
    setCari("");
  };
  const pilihWilayah = (kode: string) => {
    if (!data) return;
    if (data.wilayah.tingkat === "provinsi") pilihProv(kode);
    else setKab(kab === kode ? "" : kode);
  };
  const ubahUrut = (kunci: KunciUrut) =>
    setUrut((u) => (u.kunci === kunci ? { kunci, naik: !u.naik } : { kunci, naik: kunci === "nama" }));

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md flex items-start gap-3 text-sm text-red-700">
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        {error}
      </div>
    );
  }
  if (!data) {
    return <p className="text-sm text-slate-500">{loading ? "Memuat data koperasi…" : ""}</p>;
  }
  if (data.kosong) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md text-sm text-amber-800">
        Data koperasi belum dimuat ke server. Hubungi admin untuk menjalankan <code>import_koperasi</code>.
      </div>
    );
  }

  const { kpi, lingkup } = data;
  const namaLingkup = lingkup.kab?.nama ?? lingkup.prov?.nama ?? "Seluruh Indonesia";
  const kolomWilayah = data.wilayah.tingkat === "provinsi" ? "Provinsi" : "Kabupaten/Kota";
  const kdkmpAda = kpi.kdkmp > 0;
  const kolom: { kunci: KunciUrut; label: string; kiri?: boolean }[] = [
    { kunci: "nama", label: kolomWilayah, kiri: true },
    { kunci: "koperasi", label: "Total" },
    { kunci: "aktif", label: "Aktif" },
    { kunci: "kdkmp", label: "KDKMP" },
    { kunci: "reguler", label: "Reguler" },
    { kunci: "persen_kdkmp", label: "% KDKMP" },
    { kunci: "anggota", label: "Anggota" },
  ];

  return (
    <div className={`flex flex-col gap-6 ${loading ? "opacity-60 transition-opacity" : ""}`}>
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Landmark size={24} className="text-blue-600" />
          Overview Koperasi
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gambaran koperasi Indonesia per kabupaten/kota (sumber: data koperasi Kemenkop), membandingkan Koperasi Desa/Kelurahan
          Merah Putih (KDKMP) dengan koperasi reguler.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Tahun
          <select
            value={String(data.tahun)}
            onChange={(e) => setTahun(e.target.value)}
            className="border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm font-normal normal-case bg-white text-gray-900"
          >
            {[...data.tahun_tersedia].reverse().map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Provinsi
          <SearchableSelect
            options={[{ value: "", label: "Seluruh Indonesia" }, ...data.opsi.provinsi.map((p) => ({ value: p.kode, label: p.nama }))]}
            value={prov}
            onChange={pilihProv}
            placeholder="Seluruh Indonesia"
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm font-normal normal-case bg-white text-gray-900"
          />
        </div>
        <div className="flex flex-col gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Kabupaten/Kota
          <SearchableSelect
            options={[{ value: "", label: "Semua kabupaten/kota" }, ...data.opsi.kabupaten.map((k) => ({ value: k.kode, label: k.nama }))]}
            value={kab}
            onChange={setKab}
            disabled={!prov}
            placeholder={prov ? "Semua kabupaten/kota" : "Pilih provinsi dulu"}
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm font-normal normal-case bg-white text-gray-900"
          />
        </div>
      </div>

      <p className="text-sm text-slate-600">
        Menampilkan <strong>{namaLingkup}</strong>, tahun <strong>{data.tahun}</strong>.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kartu ikon={<Building2 size={14} />} judul="Total koperasi" nilai={nf.format(kpi.koperasi)}
          catatan={`${nf.format(kpi.aktif)} aktif (${persen(kpi.persen_aktif)}) · ${nf.format(kpi.tidak_aktif)} tidak aktif`} />
        <Kartu ikon={<Landmark size={14} />} judul="KDKMP" aksen="border-rose-200" nilai={nf.format(kpi.kdkmp)}
          catatan={kdkmpAda
            ? `${persen(kpi.persen_kdkmp)} dari total · ${nf.format(kpi.kdkmp_desa)} desa, ${nf.format(kpi.kdkmp_kelurahan)} kelurahan`
            : "Belum ada KDKMP pada cakupan ini"} />
        <Kartu ikon={<Building2 size={14} />} judul="Koperasi reguler" nilai={nf.format(kpi.reguler)}
          catatan={`${nf.format(kpi.reguler_aktif)} aktif · total dikurangi KDKMP`} />
        <Kartu ikon={<Users size={14} />} judul="Anggota" nilai={nf.format(kpi.anggota)}
          catatan={`${nf.format(kpi.tenaga_kerja)} tenaga kerja koperasi`} />
        <Kartu ikon={<Wallet size={14} />} judul="Aset" nilai={rupiah(kpi.aset)} />
        <Kartu ikon={<Banknote size={14} />} judul="Volume usaha" nilai={rupiah(kpi.volume_usaha)} />
        <Kartu ikon={<Banknote size={14} />} judul="Sisa hasil usaha" nilai={rupiah(kpi.shu)} />
        <Kartu ikon={<Building2 size={14} />} judul="Bersertifikat" nilai={nf.format(kpi.bersertifikat)}
          catatan={`${nf.format(kpi.sudah_rat)} koperasi sudah RAT`} />
      </div>

      <Panel judul="Tren jumlah koperasi" catatan="Batang: koperasi reguler dan KDKMP (ditumpuk). Garis: koperasi aktif.">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.tren} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="tahun" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={56} tickFormatter={(v) => nf.format(v)} />
              <Tooltip formatter={(v) => nf.format(Number(v))} />
              <Legend />
              <Bar dataKey="reguler" name="Reguler" stackId="k" fill="#3b82f6" />
              <Bar dataKey="kdkmp" name="KDKMP" stackId="k" fill="#f43f5e" />
              <Line dataKey="aktif" name="Aktif" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel judul="Jenis koperasi" catatan="KDKMP = Desa Merah Putih + Kelurahan Merah Putih.">
          <Peringkat data={data.jenis} />
        </Panel>
        <Panel judul="Bentuk koperasi">
          <Peringkat data={data.bentuk} />
        </Panel>
        <Panel judul="Sektor usaha" catatan="Jumlah koperasi menurut sektor usaha utama.">
          <Peringkat data={data.sektor} kosong="Belum ada data sektor untuk tahun ini." />
        </Panel>
        <Panel
          judul="Kelompok koperasi"
          catatan={data.kelompok_lainnya > 0 ? `15 terbesar; ${nf.format(data.kelompok_lainnya)} koperasi lainnya tidak ditampilkan.` : undefined}
        >
          <Peringkat data={data.kelompok} />
        </Panel>
      </div>

      <Panel
        judul={`Koperasi per ${kolomWilayah.toLowerCase()}`}
        catatan={data.wilayah.tingkat === "provinsi" ? "Klik provinsi untuk melihat kabupaten/kota di dalamnya." : "Klik kabupaten/kota untuk menyorot dan memfilter."}
      >
        <div className="relative mb-3 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder={`Cari ${kolomWilayah.toLowerCase()}…`}
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 pl-9 pr-3 text-sm bg-white text-gray-900"
          />
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {kolom.map((k) => (
                  <th key={k.kunci} className={`px-3 py-2 font-semibold whitespace-nowrap ${k.kiri ? "text-left" : "text-right"}`}>
                    <button type="button" onClick={() => ubahUrut(k.kunci)} className="inline-flex items-center gap-1 hover:text-blue-700">
                      {k.label}
                      {urut.kunci === k.kunci && (urut.naik ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {baris.map((b) => (
                <tr
                  key={b.kode}
                  onClick={() => pilihWilayah(b.kode)}
                  className={`cursor-pointer hover:bg-blue-50 ${b.kode === kab ? "bg-blue-50 font-semibold" : ""}`}
                >
                  <td className="px-3 py-2 text-slate-800">{b.nama}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{nf.format(b.koperasi)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{nf.format(b.aktif)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-rose-700">{nf.format(b.kdkmp)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{nf.format(b.reguler)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{persen(b.persen_kdkmp)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{nf.format(b.anggota)}</td>
                </tr>
              ))}
              {baris.length === 0 && (
                <tr><td colSpan={kolom.length} className="px-3 py-6 text-center text-slate-500">Tidak ada yang cocok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 flex gap-3">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1.5">
          <p>
            <strong>Catatan data.</strong> Angka di halaman ini berada di level kabupaten/kota, belum per desa. KDKMP dihitung dari jenis
            koperasi Desa dan Kelurahan Merah Putih (ada sejak 2025); status “aktif” mengikuti data Kemenkop. Tahun {data.tahun_tersedia[data.tahun_tersedia.length - 1]} adalah data terbaru yang tersedia.
          </p>
          <p>
            <strong>Segera menyusul.</strong> Sebaran KDKMP per desa, komoditas unggulan (Podes) pada tiap KDKMP, dan perbandingan
            komoditas unggulan dengan jenis usaha koperasi menunggu data sebaran KDKMP.
          </p>
        </div>
      </div>
    </div>
  );
}
