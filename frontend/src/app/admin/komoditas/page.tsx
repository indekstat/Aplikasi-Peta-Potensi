"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const PROVINCES = [
  { name: "ACEH", code: "1100000" },
  { name: "BALI", code: "5100000" },
  { name: "BANTEN", code: "3600000" },
  { name: "BENGKULU", code: "1700000" },
  { name: "DAERAH ISTIMEWA YOGYAKARTA", code: "3400000" },
  { name: "DKI JAKARTA", code: "3100000" },
  { name: "GORONTALO", code: "7500000" },
  { name: "JAMBI", code: "1500000" },
  { name: "JAWA BARAT", code: "3200000" },
  { name: "JAWA TENGAH", code: "3300000" },
  { name: "JAWA TIMUR", code: "3500000" },
  { name: "KALIMANTAN BARAT", code: "6100000" },
  { name: "KALIMANTAN SELATAN", code: "6300000" },
  { name: "KALIMANTAN TENGAH", code: "6200000" },
  { name: "KALIMANTAN TIMUR", code: "6400000" },
  { name: "KALIMANTAN UTARA", code: "6500000" },
  { name: "KEPULAUAN BANGKA BELITUNG", code: "1900000" },
  { name: "KEPULAUAN RIAU", code: "2100000" },
  { name: "LAMPUNG", code: "1800000" },
  { name: "MALUKU", code: "8100000" },
  { name: "MALUKU UTARA", code: "8200000" },
  { name: "NUSA TENGGARA BARAT", code: "5200000" },
  { name: "NUSA TENGGARA TIMUR", code: "5300000" },
  { name: "PAPUA", code: "9100000" },
  { name: "PAPUA BARAT", code: "9200000" },
  { name: "PAPUA BARAT DAYA", code: "9600000" },
  { name: "PAPUA PEGUNUNGAN", code: "9500000" },
  { name: "PAPUA SELATAN", code: "9300000" },
  { name: "PAPUA TENGAH", code: "9400000" },
  { name: "RIAU", code: "1400000" },
  { name: "SULAWESI BARAT", code: "7600000" },
  { name: "SULAWESI SELATAN", code: "7300000" },
  { name: "SULAWESI TENGAH", code: "7200000" },
  { name: "SULAWESI TENGGARA", code: "7400000" },
  { name: "SULAWESI UTARA", code: "7100000" },
  { name: "SUMATERA BARAT", code: "1300000" },
  { name: "SUMATERA SELATAN", code: "1600000" },
  { name: "SUMATERA UTARA", code: "1200000" }
];

const YEARS = ["2025", "2024", "2023", "2022", "2021", "2020", "2019"];

export default function KomoditasPage() {
  const { user } = useAuth();
  
  const [selectedYear, setSelectedYear] = useState("2022");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  
  const [districts, setDistricts] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [komoditasData, setKomoditasData] = useState<any[]>([]);
  
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchLocations = async () => {
      if (!user) return;
      if (!user.is_superuser && !user?.profile?.asal_provinsi) return;
      
      try {
        const provRes = await fetch(`${API_BASE}/api/provinces/`);
        const provData = await provRes.json();
        const distRes = await fetch(`${API_BASE}/api/districts/`);
        const distData = await distRes.json();
        
        const sortedProv = provData.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setProvinces(sortedProv);

        if (user.is_superuser) {
          setDistricts(distData.sort((a: any, b: any) => a.name.localeCompare(b.name)));
        } else {
          const prov = provData.find((p: any) => p.name === user.profile.asal_provinsi);
          if (prov) {
            setSelectedProvince(prov.name);
            const filtered = distData.filter((d: any) => d.province === prov.id);
            setDistricts(filtered.sort((a: any, b: any) => a.name.localeCompare(b.name)));
          }
          if (user.profile.asal_kokab) {
            setSelectedDistrict(user.profile.asal_kokab);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLocations();
  }, [user, API_BASE]);

  // Auto-refresh when Kokab changes
  useEffect(() => {
    if (user?.is_superuser && selectedDistrict && komoditasData.length > 0) {
      handleFetchKomoditas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict]);

  const handleFetchKomoditas = async () => {
    if (user?.is_superuser && !selectedDistrict) {
      setError("Silakan pilih Kabupaten/Kota terlebih dahulu.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setKomoditasData([]);
    
    try {
      let provCode = "3300000"; // Jateng default
      if (user?.is_superuser && selectedDistrict) {
        const matchedDist = districts.find(d => d.name === selectedDistrict);
        if (matchedDist) {
          const prov = PROVINCES.find(p => p.name === matchedDist.province_name);
          if (prov) provCode = prov.code;
        }
      } else if (user?.profile?.asal_provinsi) {
        const input = user.profile.asal_provinsi.toUpperCase();
        const match = PROVINCES.find(p => p.code === input || p.name.includes(input) || input.includes(p.name));
        if (match) provCode = match.code;
      }

      const res = await fetch(`/api/bps-komoditas?tahun=${selectedYear}&wilayah=${provCode}`);
      if (!res.ok) throw new Error(`Gagal memuat data BPS Komoditas tahun ${selectedYear}`);
      
      const json = await res.json();
      if (json.data && json.data.length >= 2 && json.data[1].data) {
        const items = json.data[1].data.map((item: any) => {
          const varKeys = Object.keys(item.variables);
          const varKey = varKeys.length > 0 ? varKeys[0] : null;
          const rawValue = varKey ? item.variables[varKey].value_raw : null;
          
          return {
            label: (item.label_raw || item.label || "Unknown").replace(/<[^>]*>?/gm, '').trim(),
            value: rawValue !== null && rawValue !== undefined ? String(rawValue) : "-",
            unit: varKey ? item.variables[varKey].unit || "" : ""
          };
        });
        setKomoditasData(items);
      } else {
        setKomoditasData([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Daftar Komoditas per Kota/Kab</h1>
          <p className="text-sm text-gray-500 mt-1">Lihat data referensi BPS terkait daftar komoditas suatu wilayah.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        
        {/* District Selection */}
        <div className="border-b pb-4 mb-4 flex flex-col md:flex-row gap-4 items-start justify-between">
          <div className="w-full md:w-2/3 flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <label className="block text-sm font-medium text-gray-700">Pilih Provinsi</label>
              <select 
                value={selectedProvince} 
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setSelectedDistrict("");
                }} 
                disabled={!user?.is_superuser} 
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${user?.is_superuser ? 'bg-white' : 'bg-gray-100 cursor-not-allowed text-gray-700'}`}
              >
                <option value="" disabled>-- Pilih Provinsi --</option>
                {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            
            <div className="w-full md:w-1/2">
              <label className="block text-sm font-medium text-gray-700">Pilih Kabupaten/Kota</label>
              <select 
                value={selectedDistrict} 
                onChange={(e) => setSelectedDistrict(e.target.value)} 
                disabled={!user?.is_superuser || !selectedProvince} 
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${user?.is_superuser && selectedProvince ? 'bg-white' : 'bg-gray-100 cursor-not-allowed text-gray-700'}`}
              >
                <option value="" disabled>-- Pilih Kokab --</option>
                {districts
                  .filter(d => user?.is_superuser ? d.province_name === selectedProvince : true)
                  .map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Configurations */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tahun</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md bg-white">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          
          <button 
            onClick={handleFetchKomoditas} 
            disabled={loading || (user?.is_superuser && !selectedDistrict)} 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Memuat..." : "Ambil Data Komoditas BPS"}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {komoditasData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Referensi Data Komoditas BPS ({selectedYear})</h2>
          
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left w-12 text-gray-500">No</th>
                  <th className="px-4 py-2 text-left">Nama Komoditas</th>
                  <th className="px-4 py-2 text-right">Nilai / Satuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {komoditasData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">{item.label}</td>
                    <td className="px-4 py-2 text-right">
                      <span className="font-semibold">{item.value}</span> {item.unit && <span className="text-gray-500 text-xs ml-1">{item.unit}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
