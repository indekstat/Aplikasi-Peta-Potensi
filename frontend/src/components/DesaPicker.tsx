"use client";

import { useEffect, useState } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type Wilayah = { kode: string; nama: string };
type DesaOpsi = { iddesa: string; nama: string; terdaftar: boolean };

async function ambil(params: Record<string, string>) {
  const res = await fetch(`/api/desa/wilayah?${new URLSearchParams(params)}`);
  if (!res.ok) throw new Error("Gagal memuat daftar wilayah");
  return res.json();
}

/** Pemilih desa bertingkat (provinsi > kab/kota > kecamatan > desa) dari data Podes. onChange("") saat pilihan dikosongkan. */
export function DesaPicker({ onChange }: { onChange: (iddesa: string) => void }) {
  const [prov, setProv] = useState("");
  const [kab, setKab] = useState("");
  const [kec, setKec] = useState("");
  const [desa, setDesa] = useState("");
  const [listProv, setListProv] = useState<Wilayah[]>([]);
  const [listKab, setListKab] = useState<Wilayah[]>([]);
  const [listKec, setListKec] = useState<Wilayah[]>([]);
  const [listDesa, setListDesa] = useState<DesaOpsi[]>([]);
  const [error, setError] = useState("");

  const gagal = () => setError("Gagal memuat daftar wilayah. Coba muat ulang halaman.");

  useEffect(() => {
    ambil({ tingkat: "provinsi" }).then(setListProv).catch(gagal);
  }, []);

  const pilihProv = (kode: string) => {
    setProv(kode); setKab(""); setKec(""); setDesa(""); setListKab([]); setListKec([]); setListDesa([]);
    onChange("");
    if (kode) ambil({ tingkat: "kabupaten", prov: kode }).then(setListKab).catch(gagal);
  };
  const pilihKab = (kode: string) => {
    setKab(kode); setKec(""); setDesa(""); setListKec([]); setListDesa([]);
    onChange("");
    if (kode) ambil({ tingkat: "kecamatan", prov, kab: kode }).then(setListKec).catch(gagal);
  };
  const pilihKec = (kode: string) => {
    setKec(kode); setDesa(""); setListDesa([]);
    onChange("");
    if (kode) ambil({ tingkat: "desa", prov, kab, kec: kode }).then(setListDesa).catch(gagal);
  };
  const pilihDesa = (id: string) => {
    setDesa(id);
    onChange(id);
  };

  const kelas = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white";
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {error && <p className="sm:col-span-2 lg:col-span-4 text-sm text-rose-600">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-gray-600">Provinsi</label>
        <SearchableSelect value={prov} onChange={pilihProv} className={kelas} placeholder="-- Pilih Provinsi --"
          options={listProv.map((w) => ({ label: w.nama, value: w.kode }))} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600">Kabupaten / Kota</label>
        <SearchableSelect value={kab} onChange={pilihKab} disabled={!prov} className={kelas} placeholder="-- Pilih Kabupaten / Kota --"
          options={listKab.map((w) => ({ label: w.nama, value: w.kode }))} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600">Kecamatan</label>
        <SearchableSelect value={kec} onChange={pilihKec} disabled={!kab} className={kelas} placeholder="-- Pilih Kecamatan --"
          options={listKec.map((w) => ({ label: w.nama, value: w.kode }))} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600">Desa / Kelurahan</label>
        <SearchableSelect value={desa} onChange={pilihDesa} disabled={!kec} className={kelas} placeholder="-- Pilih Desa / Kelurahan --"
          options={listDesa.map((d) => ({ label: d.terdaftar ? `${d.nama} (sudah ada akun)` : d.nama, value: d.iddesa }))} />
      </div>
    </div>
  );
}
