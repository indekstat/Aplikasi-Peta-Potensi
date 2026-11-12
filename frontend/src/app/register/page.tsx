"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    first_name: "", // Name
    asal_provinsi: "",
    asal_kokab: "",
    phone_number: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | string>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<any[]>([]);

  const API_BASE = "";

  // Akun koperasi desa: pilih desa lewat daftar bertingkat Podes (provinsi > kab/kota > kecamatan > desa).
  type Wilayah = { kode: string; nama: string };
  type DesaOpsi = { iddesa: string; nama: string; terdaftar: boolean };
  const [accountType, setAccountType] = useState<"daerah" | "koperasi">("daerah");
  const [desaProv, setDesaProv] = useState("");
  const [desaKab, setDesaKab] = useState("");
  const [desaKec, setDesaKec] = useState("");
  const [desaId, setDesaId] = useState("");
  const [listProv, setListProv] = useState<Wilayah[]>([]);
  const [listKab, setListKab] = useState<Wilayah[]>([]);
  const [listKec, setListKec] = useState<Wilayah[]>([]);
  const [listDesa, setListDesa] = useState<DesaOpsi[]>([]);

  const ambilWilayah = async (params: Record<string, string>) => {
    const res = await fetch(`${API_BASE}/api/desa/wilayah?${new URLSearchParams(params)}`);
    if (!res.ok) throw new Error("Gagal memuat daftar wilayah");
    return res.json();
  };

  useEffect(() => {
    if (accountType !== "koperasi" || listProv.length > 0) return;
    ambilWilayah({ tingkat: "provinsi" }).then(setListProv).catch(() => setError("Gagal memuat daftar provinsi desa."));
  }, [accountType, listProv.length]);

  const pilihDesaProv = (kode: string) => {
    setDesaProv(kode); setDesaKab(""); setDesaKec(""); setDesaId("");
    setListKab([]); setListKec([]); setListDesa([]);
    if (kode) ambilWilayah({ tingkat: "kabupaten", prov: kode }).then(setListKab).catch(() => setError("Gagal memuat kabupaten/kota."));
  };
  const pilihDesaKab = (kode: string) => {
    setDesaKab(kode); setDesaKec(""); setDesaId("");
    setListKec([]); setListDesa([]);
    if (kode) ambilWilayah({ tingkat: "kecamatan", prov: desaProv, kab: kode }).then(setListKec).catch(() => setError("Gagal memuat kecamatan."));
  };
  const pilihDesaKec = (kode: string) => {
    setDesaKec(kode); setDesaId("");
    setListDesa([]);
    if (kode) ambilWilayah({ tingkat: "desa", prov: desaProv, kab: desaKab, kec: kode }).then(setListDesa).catch(() => setError("Gagal memuat desa."));
  };
  const desaTersedia = listDesa.filter((d) => !d.terdaftar);
  const desaSudahTerdaftar = listDesa.length - desaTersedia.length;

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const provRes = await fetch(`${API_BASE}/api/provinces`);
        const provData = await provRes.json();
        const sortedProvData = provData.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setProvinces(sortedProvData);

        const distRes = await fetch(`${API_BASE}/api/districts`);
        const distData = await distRes.json();
        const sortedDistData = distData.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setDistricts(sortedDistData);
      } catch (err) {
        console.error("Gagal memuat data provinsi/kabupaten", err);
      }
    };
    fetchLocations();
  }, [API_BASE]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Filter districts if province changes
    if (name === "asal_provinsi") {
      // Find province id based on selected name
      const selectedProv = provinces.find((p) => p.name === value);
      if (selectedProv) {
        const filtered = districts.filter((d) => d.province === selectedProv.id);
        setFilteredDistricts(filtered);
      } else {
        setFilteredDistricts([]);
      }
      // Reset district
      setFormData(prev => ({ ...prev, asal_provinsi: value, asal_kokab: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

    if (formData.password !== confirmPassword) {
      setFieldErrors({ confirmPassword: ["Password dan Konfirmasi Password tidak cocok."] });
      setLoading(false);
      return;
    }

    if (accountType === "koperasi" && !desaId) {
      setFieldErrors({ desa_id: ["Desa wajib dipilih."] });
      setLoading(false);
      return;
    }

    const { asal_provinsi, asal_kokab, ...dataUmum } = formData;
    const payload = accountType === "koperasi"
      ? { ...dataUmum, account_type: "koperasi", desa_id: desaId }
      : { ...formData, account_type: "daerah" };

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setFieldErrors(errorData);
        throw new Error("Terdapat kesalahan pengisian data.");
      }

      // Success
      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="flex flex-col items-center">
          <img
            src="/logo/LOGO REGINA 2.png"
            alt="REGINA Logo"
            className="h-10 w-auto object-contain mb-2"
          />
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            Daftar Akun Baru
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Silakan lengkapi data profil Anda
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 text-sm font-medium" role="tablist" aria-label="Jenis akun">
          {([
            ["daerah", "DPMPTSP / Daerah"],
            ["koperasi", "Koperasi Desa"],
          ] as const).map(([tipe, label]) => (
            <button
              key={tipe}
              type="button"
              role="tab"
              aria-selected={accountType === tipe}
              onClick={() => { setAccountType(tipe); setFieldErrors({}); setError(""); }}
              className={`rounded-md py-2 transition-colors ${accountType === tipe ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input type="text" name="username" required onChange={handleChange} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${fieldErrors.username ? 'border-red-500' : 'border-gray-300'}`} />
              {fieldErrors.username && <p className="text-red-500 text-xs mt-1">{fieldErrors.username}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
              <input type="text" name="first_name" required onChange={handleChange} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${fieldErrors.first_name ? 'border-red-500' : 'border-gray-300'}`} />
              {fieldErrors.first_name && <p className="text-red-500 text-xs mt-1">{fieldErrors.first_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" name="email" required onChange={handleChange} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${fieldErrors.email ? 'border-red-500' : 'border-gray-300'}`} />
              {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" name="password" required onChange={handleChange} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${fieldErrors.password ? 'border-red-500' : 'border-gray-300'}`} />
              {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Konfirmasi Password</label>
              <input type="password" name="confirmPassword" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`} />
              {fieldErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Nomor HP</label>
              <input type="text" name="phone_number" required onChange={handleChange} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${fieldErrors.phone_number ? 'border-red-500' : 'border-gray-300'}`} />
              {fieldErrors.phone_number && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone_number}</p>}
            </div>

            {accountType === "koperasi" ? (
              <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Provinsi</label>
                <SearchableSelect
                  value={desaProv}
                  onChange={pilihDesaProv}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                  options={listProv.map((w) => ({ label: w.nama, value: w.kode }))}
                  placeholder="-- Pilih Provinsi --"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kabupaten / Kota</label>
                <SearchableSelect
                  value={desaKab}
                  onChange={pilihDesaKab}
                  disabled={!desaProv}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                  options={listKab.map((w) => ({ label: w.nama, value: w.kode }))}
                  placeholder="-- Pilih Kabupaten / Kota --"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kecamatan</label>
                <SearchableSelect
                  value={desaKec}
                  onChange={pilihDesaKec}
                  disabled={!desaKab}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                  options={listKec.map((w) => ({ label: w.nama, value: w.kode }))}
                  placeholder="-- Pilih Kecamatan --"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Desa / Kelurahan</label>
                <SearchableSelect
                  value={desaId}
                  onChange={(val) => setDesaId(val)}
                  disabled={!desaKec}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-white ${fieldErrors.desa_id ? 'border-red-500' : 'border-gray-300'}`}
                  options={desaTersedia.map((d) => ({ label: d.nama, value: d.iddesa }))}
                  placeholder="-- Pilih Desa / Kelurahan --"
                />
                {fieldErrors.desa_id && <p className="text-red-500 text-xs mt-1">{fieldErrors.desa_id}</p>}
                {desaKec && desaSudahTerdaftar > 0 && (
                  <p className="text-gray-500 text-xs mt-1">{desaSudahTerdaftar} desa di kecamatan ini sudah memiliki akun koperasi dan tidak ditampilkan.</p>
                )}
              </div>
              </>
            ) : (
              <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Asal DPMPTSP Provinsi</label>
                <SearchableSelect 
                  value={formData.asal_provinsi} 
                  onChange={(val) => handleChange({ target: { name: 'asal_provinsi', value: val } } as any)} 
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-white ${fieldErrors.asal_provinsi ? 'border-red-500' : 'border-gray-300'}`}
                  options={provinces.map((prov: any) => ({ label: prov.name, value: prov.name }))}
                  placeholder="-- Pilih Provinsi --"
                />
                {fieldErrors.asal_provinsi && <p className="text-red-500 text-xs mt-1">{fieldErrors.asal_provinsi}</p>}
              </div>
            
              <div>
                <label className="block text-sm font-medium text-gray-700">Asal Kabupaten / Kota</label>
                <SearchableSelect 
                  value={formData.asal_kokab} 
                  onChange={(val) => handleChange({ target: { name: 'asal_kokab', value: val } } as any)} 
                  disabled={!formData.asal_provinsi} 
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-white ${fieldErrors.asal_kokab ? 'border-red-500' : 'border-gray-300'}`}
                  options={filteredDistricts.map((dist: any) => ({ label: dist.name, value: dist.name }))}
                  placeholder="-- Pilih Kabupaten / Kota --"
                />
                {fieldErrors.asal_kokab && <p className="text-red-500 text-xs mt-1">{fieldErrors.asal_kokab}</p>}
              </div>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 mt-6"
            >
              {loading ? "Memproses..." : "Daftar"}
            </button>
          </div>
        </form>
        <div className="text-center text-sm">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
