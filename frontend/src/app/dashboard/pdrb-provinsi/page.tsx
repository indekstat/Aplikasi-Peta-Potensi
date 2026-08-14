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

export default function PdrbProvinsiPage() {
  const { user } = useAuth();
  
  // Try to find the user's province code if they provided a name or code in asal_provinsi
  const getDefaultProvCode = () => {
    if (!user || !user.profile || !user.profile.asal_provinsi) return "3200000"; // default Jabar
    const input = user.profile.asal_provinsi.toUpperCase();
    const match = PROVINCES.find(p => p.code === input || p.name.includes(input) || input.includes(p.name));
    return match ? match.code : "3200000";
  };

  const [selectedProv, setSelectedProv] = useState(getDefaultProvCode()); 
  const [selectedYear, setSelectedYear] = useState("2025");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bps?tahun=${selectedYear}&wilayah=${selectedProv}`);
      if (!res.ok) throw new Error("Gagal mengambil data dari BPS API");

      const json = await res.json();

      // Parse the BPS structure
      if (json.data && json.data.length >= 2 && json.data[1].data) {
        const rows = json.data[1].data.map((item: any) => {
          const varKeys = Object.keys(item.variables);
          const varKey = varKeys.length > 0 ? varKeys[0] : null;
          const valueRaw = varKey ? item.variables[varKey].value_raw : "-";

          return {
            label: item.label_raw || "Unknown",
            value: valueRaw
          };
        });
        setData(rows);
      } else {
        setData([]);
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProv, selectedYear]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">PDRB Provinsi</h1>
          <p className="text-sm text-gray-500 mt-1">Data PDRB ADHK 2010 Berdasarkan Lapangan Usaha (Sumber: API BPS SIMDASI)</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
            <select
              value={selectedProv}
              disabled={!user?.is_superuser}
              onChange={(e) => setSelectedProv(e.target.value)}
              className={`w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm text-gray-900 ${user?.is_superuser ? 'bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-100 cursor-not-allowed text-gray-700'}`}
            >
              {PROVINCES.map((prov) => (
                <option key={prov.code} value={prov.code}>{prov.name}</option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-gray-900"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchData}
              disabled={loading}
              className="w-full md:w-auto bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Memuat..." : "Refresh Data"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/3">
                  Lapangan Usaha
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                  Nilai PDRB (Miliar Rp)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p>Mengambil data dari BPS...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-gray-500">
                    Tidak ada data yang tersedia untuk provinsi dan tahun ini.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const cleanedLabel = row.label.replace(/<[^>]*>?/gm, '').trim();
                  const isTitle = cleanedLabel.match(/^[A-Z](,[A-Z])*\s/);
                  const isGrandTotal = cleanedLabel.toLowerCase().includes("produk domestik bruto");
                  const isLevel3 = ["Tanaman Pangan", "Tanaman Hortikultura", "Tanaman Perkebunan", "Peternakan", "Jasa Pertanian dan Perburuan"].includes(cleanedLabel);
                  
                  let labelClass = "text-sm text-gray-900";
                  if (isTitle || isGrandTotal) labelClass = "text-sm font-bold text-gray-900";
                  else if (isLevel3) labelClass = "text-sm text-gray-500 pl-8";
                  else labelClass = "text-sm text-gray-700 pl-4";
                  
                  let rowClass = "hover:bg-gray-50";
                  if (isTitle) rowClass = "bg-gray-50/50 hover:bg-gray-50";
                  if (isGrandTotal) rowClass = "bg-blue-50/30 hover:bg-blue-50/50 border-t-2 border-blue-100";

                  return (
                    <tr key={idx} className={rowClass}>
                      <td className={`px-6 py-3 break-words whitespace-pre-wrap ${labelClass}`}>
                        {cleanedLabel}
                      </td>
                      <td className={`px-6 py-3 whitespace-nowrap text-sm text-right ${isTitle || isGrandTotal ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {row.value}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
