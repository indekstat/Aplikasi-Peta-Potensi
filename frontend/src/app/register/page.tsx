"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const provRes = await fetch(`${API_BASE}/api/provinces/`);
        const provData = await provRes.json();
        const sortedProvData = provData.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setProvinces(sortedProvData);

        const distRes = await fetch(`${API_BASE}/api/districts/`);
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

    try {
      const res = await fetch(`${API_BASE}/api/auth/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
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
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Daftar Akun Baru
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Silakan lengkapi data profil Anda
          </p>
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

            <div>
              <label className="block text-sm font-medium text-gray-700">Asal DPMPTSP Provinsi</label>
              <select name="asal_provinsi" required value={formData.asal_provinsi} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white ${fieldErrors.asal_provinsi ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="" disabled>-- Pilih Provinsi --</option>
                {provinces.map((prov: any) => (
                  <option key={prov.id} value={prov.name}>{prov.name}</option>
                ))}
              </select>
              {fieldErrors.asal_provinsi && <p className="text-red-500 text-xs mt-1">{fieldErrors.asal_provinsi}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Asal Kabupaten / Kota</label>
              <select name="asal_kokab" required value={formData.asal_kokab} onChange={handleChange} disabled={!formData.asal_provinsi} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white disabled:bg-gray-100 ${fieldErrors.asal_kokab ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="" disabled>-- Pilih Kabupaten / Kota --</option>
                {filteredDistricts.map((dist: any) => (
                  <option key={dist.id} value={dist.name}>{dist.name}</option>
                ))}
              </select>
              {fieldErrors.asal_kokab && <p className="text-red-500 text-xs mt-1">{fieldErrors.asal_kokab}</p>}
            </div>
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
