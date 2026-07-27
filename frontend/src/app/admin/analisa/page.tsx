"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';

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

const NumberInput = ({ value, onChange, className }: { value: string | number, onChange: (val: string) => void, className?: string }) => {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    if (value === undefined || value === null || value === "") {
      setDisplayValue("");
    } else {
      const numStr = String(value);
      if (!isNaN(Number(numStr))) {
        setDisplayValue(Number(numStr).toLocaleString("id-ID"));
      } else {
        setDisplayValue(numStr);
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const cleaned = rawInput.replace(/[^\d,]/g, "");
    setDisplayValue(cleaned);
    const standardStr = cleaned.replace(/,/g, ".");
    onChange(standardStr);
  };

  const handleBlur = () => {
    if (displayValue && !isNaN(Number(displayValue.replace(/,/g, ".")))) {
      setDisplayValue(Number(displayValue.replace(/,/g, ".")).toLocaleString("id-ID"));
    }
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
};

export default function AnalisaPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"LQ" | "SSA" | "KLASSEN">("LQ");
  
  const [baseYear, setBaseYear] = useState("2021");
  const [finalYear, setFinalYear] = useState("2024");
  const [selectedSector, setSelectedSector] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [districts, setDistricts] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [subsectors, setSubsectors] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
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
        const subRes = await fetch(`${API_BASE}/api/subsectors/`);
        if (subRes.ok) setSubsectors(await subRes.json());
        
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

  // States to hold BPS Data (Provinsi) mapped by year
  const [provDataByYear, setProvDataByYear] = useState<Record<string, any[]>>({});
  const [provTotalByYear, setProvTotalByYear] = useState<Record<string, number>>({});

  // State to hold Kokab input data
  // kokabData[year][sector]
  const [kokabData, setKokabData] = useState<Record<string, Record<string, number>>>({});
  // totalKokab[year]
  const [totalKokab, setTotalKokab] = useState<Record<string, number>>({});

  // Analysis results
  const [lqResult, setLqResult] = useState<any>(null);
  const [ssaResults, setSsaResults] = useState<any[]>([]);
  const [klassenResults, setKlassenResults] = useState<any[]>([]);

  // Array of years involved in the current analysis
  const [activeYears, setActiveYears] = useState<string[]>([]);
  
  // Save confirmation modal
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Load from LocalStorage & Database
  useEffect(() => {
    const fetchSavedData = async () => {
      if (!selectedDistrict) {
        setKokabData({});
        setTotalKokab({});
        return;
      }
      
      // LocalStorage (fallback/fast load)
      const saved = localStorage.getItem(`pdrb_v2_${selectedDistrict}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.kokabData) setKokabData(parsed.kokabData);
          if (parsed.totalKokab) setTotalKokab(parsed.totalKokab);
        } catch(e) {}
      }
      
      // Database (source of truth)
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE}/api/get-pdrb/?kab_name=${selectedDistrict}`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const json = await res.json();
          if (json.kokabData && Object.keys(json.kokabData).length > 0) {
            setKokabData(prev => ({ ...prev, ...json.kokabData }));
            setTotalKokab(prev => ({ ...prev, ...json.totalKokab }));
          }
        }
      } catch (e) {
        console.error("Gagal menarik data dari database", e);
      }
    };
    fetchSavedData();
  }, [selectedDistrict, API_BASE]);

  // Save to LocalStorage
  useEffect(() => {
    if (selectedDistrict) {
      localStorage.setItem(`pdrb_v2_${selectedDistrict}`, JSON.stringify({
        kokabData,
        totalKokab
      }));
    }
  }, [kokabData, totalKokab, selectedDistrict]);

  // Auto-refresh BPS when Kokab changes
  useEffect(() => {
    if (user?.is_superuser && selectedDistrict && activeYears.length > 0) {
      handleFetchProvinsi();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict]);

  const fetchBpsData = async (year: string) => {
    let provCode = "3200000"; // Jabar by default
    if (user?.is_superuser && selectedDistrict) {
      // Find the province of the selected district
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

    const res = await fetch(`/api/bps?tahun=${year}&wilayah=${provCode}`);
    if (!res.ok) throw new Error(`Gagal memuat data BPS tahun ${year}`);
    const json = await res.json();
    if (json.data && json.data.length >= 2 && json.data[1].data) {
      const allItems = json.data[1].data.map((item: any) => {
        const varKeys = Object.keys(item.variables);
        const varKey = varKeys.length > 0 ? varKeys[0] : null;
        const rawValue = varKey ? item.variables[varKey].value_raw : null;
        const valStr = rawValue !== null && rawValue !== undefined ? String(rawValue) : "0";
        const valNum = parseFloat(valStr.replace(/\./g, "").replace(/,/g, "."));
        
        const rawLabel = item.label_raw || "Unknown";
        return {
          label: rawLabel.replace(/<[^>]*>?/gm, '').trim(),
          value: isNaN(valNum) ? 0 : valNum,
        };
      });

      // Pisahkan "Produk Domestik Bruto" sebagai total, sisanya sebagai sektor
      const totalItem = allItems.find((item: any) => item.label.toLowerCase().includes("produk domestik bruto") || item.label.toLowerCase().includes("pdrb"));
      const sectors = allItems.filter((item: any) => !(item.label.toLowerCase().includes("produk domestik bruto") || item.label.toLowerCase().includes("pdrb")));
      
      const total = totalItem ? totalItem.value : sectors.reduce((acc: number, curr: any) => acc + curr.value, 0);

      return { sectors, total };
    }
    return { sectors: [], total: 0 };
  };

  const getYearsRange = (start: string, end: string) => {
    const s = parseInt(start);
    const e = parseInt(end);
    const min = Math.min(s, e);
    const max = Math.max(s, e);
    const arr = [];
    for (let y = min; y <= max; y++) {
      arr.push(y.toString());
    }
    return arr;
  };

  const handleFetchProvinsi = async () => {
    if (user?.is_superuser && !selectedDistrict) {
      setError("Silakan pilih Kabupaten/Kota terlebih dahulu agar sistem mengetahui data Provinsi mana yang harus diambil.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setLqResult(null);
    setSsaResults([]);
    setKlassenResults([]);
    
    try {
      let yearsToFetch: string[] = [];
      if (activeTab === "LQ") {
        yearsToFetch = [finalYear];
      } else if (activeTab === "SSA" || activeTab === "KLASSEN") {
        yearsToFetch = getYearsRange(baseYear, finalYear);
      }
      
      const promises = yearsToFetch.map(y => fetchBpsData(y));
      const results = await Promise.all(promises);
      
      const newProvDataByYear: Record<string, any[]> = {};
      const newProvTotalByYear: Record<string, number> = {};
      
      yearsToFetch.forEach((y, idx) => {
        newProvDataByYear[y] = results[idx].sectors;
        newProvTotalByYear[y] = results[idx].total;
      });
      
      setProvDataByYear(newProvDataByYear);
      setProvTotalByYear(newProvTotalByYear);
      setActiveYears(yearsToFetch);

      // Default selected sector if none
      if (results[0] && results[0].sectors.length > 0 && !selectedSector) {
        setSelectedSector(results[0].sectors[0].label);
      }

      // Initialize kokab data gracefully
      setKokabData(prev => {
        const next = { ...prev };
        yearsToFetch.forEach(y => {
          if (!next[y]) next[y] = {};
        });
        return next;
      });
      setTotalKokab(prev => {
        const next = { ...prev };
        yearsToFetch.forEach(y => {
          if (!next[y]) next[y] = 0;
        });
        return next;
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDB = () => {
    if (!selectedDistrict) return;
    setShowSaveModal(true);
  };

  const confirmSaveToDB = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/api/save-data/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify({
          type: "pdrb",
          kab_name: selectedDistrict,
          data: kokabData
        })
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message);
        setShowSaveModal(false);
      } else {
        alert(json.message || "Gagal menyimpan ke database.");
      }
    } catch (e: any) {
      alert("Terjadi kesalahan: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateKokabData = (year: string, sector: string, value: string) => {
    const val = parseFloat(value) || 0;
    setKokabData(prev => ({
      ...prev,
      [year]: {
        ...(prev[year] || {}),
        [sector]: val
      }
    }));
  };

  const updateTotalKokab = (year: string, value: string) => {
    const val = parseFloat(value) || 0;
    setTotalKokab(prev => ({
      ...prev,
      [year]: val
    }));
  };

  const calculateLQ = () => {
    if (!selectedSector || !provDataByYear[finalYear]) return;
    
    const provFinal = provDataByYear[finalYear];
    const provFinalItem = provFinal.find(p => p.label === selectedSector);
    
    const P_i_t = provFinalItem ? provFinalItem.value : 0;
    const P_t = provTotalByYear[finalYear] || 0;
    
    const K_i_t = (kokabData[finalYear] || {})[selectedSector] || 0;
    const K_t = totalKokab[finalYear] || 0;

    let lq = 0;
    if (P_i_t > 0 && K_t > 0 && P_t > 0) {
      lq = (K_i_t / K_t) / (P_i_t / P_t);
    }
    setLqResult({ label: selectedSector, lq });
  };

  const calculateSSA = () => {
    if (!selectedSector || activeYears.length < 2) return;
    
    const results = [];
    
    for (let i = 0; i < activeYears.length - 1; i++) {
      const year0 = activeYears[i];
      const yearT = activeYears[i+1];
      
      const prov0 = provDataByYear[year0] || [];
      const provT = provDataByYear[yearT] || [];
      
      const provItem0 = prov0.find(p => p.label === selectedSector);
      const provItemT = provT.find(p => p.label === selectedSector);
      
      const P_i_0 = provItem0 ? provItem0.value : 0;
      const P_i_t = provItemT ? provItemT.value : 0;
      
      const P_0 = provTotalByYear[year0] || 0;
      const P_t = provTotalByYear[yearT] || 0;
      
      const K_i_0 = (kokabData[year0] || {})[selectedSector] || 0;
      const K_i_t = (kokabData[yearT] || {})[selectedSector] || 0;

      let NGE = 0, IME = 0, RSE = 0, TotalShift = 0;
      if (K_i_0 > 0 && P_i_0 > 0 && P_0 > 0) {
        NGE = K_i_0 * ((P_t / P_0) - 1);
        IME = K_i_0 * ((P_i_t / P_i_0) - (P_t / P_0));
        RSE = K_i_0 * ((K_i_t / K_i_0) - (P_i_t / P_i_0));
        TotalShift = NGE + IME + RSE;
      }
      
      results.push({
        period: `${year0}-${yearT}`,
        NGE,
        IME,
        RSE,
        TotalShift
      });
    }
    
    setSsaResults(results);
  };

  const calculateKlassen = () => {
    if (!provDataByYear[baseYear] || !provDataByYear[finalYear]) return;
    
    const provBase = provDataByYear[baseYear];
    const provFinal = provDataByYear[finalYear];
    
    const totalProvBase = provTotalByYear[baseYear] || 0;
    const totalProvFinal = provTotalByYear[finalYear] || 0;
    
    const kokabBase = kokabData[baseYear] || {};
    const kokabFinal = kokabData[finalYear] || {};
    
    const K_t_base = Object.values(kokabBase).reduce((acc, curr) => acc + curr, 0);
    const K_t_final = Object.values(kokabFinal).reduce((acc, curr) => acc + curr, 0);

    const klassenArray: any[] = [];

    provFinal.forEach((provFinalItem) => {
      const label = provFinalItem.label;
      const P_i_t = provFinalItem.value;
      const P_t = totalProvFinal;
      const K_i_t = kokabFinal[label] || 0;
      const K_t = K_t_final;

      const provBaseItem = provBase.find(p => p.label === label);
      const P_i_0 = provBaseItem ? provBaseItem.value : 0;
      const K_i_0 = kokabBase[label] || 0;

      if (K_i_0 > 0 && P_i_0 > 0 && K_t > 0 && P_t > 0) {
        const g_ij = (K_i_t - K_i_0) / K_i_0;
        const g_i = (P_i_t - P_i_0) / P_i_0;
        const s_ij = K_i_t / K_t;
        const s_i = P_i_t / P_t;

        let kuadran = "";
        if (g_ij > g_i && s_ij > s_i) kuadran = "Kuadran I (Maju & Tumbuh Cepat)";
        else if (g_ij < g_i && s_ij > s_i) kuadran = "Kuadran II (Maju Tapi Tertekan)";
        else if (g_ij > g_i && s_ij < s_i) kuadran = "Kuadran III (Tumbuh Cepat, Belum Maju)";
        else kuadran = "Kuadran IV (Relatif Tertinggal)";

        klassenArray.push({ label, g_ij, g_i, s_ij, s_i, kuadran });
      }
    });
    setKlassenResults(klassenArray);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analisa Potensi Daerah</h1>
          <p className="text-sm text-gray-500 mt-1">Pilih mode analisis dan masukkan data PDRB Kabupaten/Kota Anda.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        
        {/* District Selection */}
        <div className="border-b pb-4 mb-4 flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
          <div className="w-full md:w-2/3 flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <label className="block text-sm font-medium text-gray-700">Pilih Provinsi</label>
              <select 
                value={selectedProvince} 
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setSelectedDistrict(""); // Reset district when province changes
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
              {user?.is_superuser && <p className="text-xs text-green-600 mt-1">* Data input tersimpan lokal otomatis.</p>}
            </div>
          </div>
          <div>
            <button 
              onClick={handleSaveToDB} 
              disabled={loading || !selectedDistrict} 
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center space-x-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
              <span>Simpan Permanen ke Database</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {["LQ", "SSA", "KLASSEN"].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as any);
                setProvDataByYear({});
                setProvTotalByYear({});
                setActiveYears([]);
                setLqResult(null);
                setSsaResults([]);
                setKlassenResults([]);
              }}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === tab 
                  ? "border-b-2 border-blue-600 text-blue-600" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Analisis {tab}
            </button>
          ))}
        </div>

        {/* Configurations */}
        <div className="flex flex-wrap gap-4 items-end">
          {activeTab !== "LQ" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Tahun Awal (Base)</label>
              <select value={baseYear} onChange={(e) => setBaseYear(e.target.value)} className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md bg-white">
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">{activeTab === "LQ" ? "Tahun" : "Tahun Akhir (Final)"}</label>
            <select value={finalYear} onChange={(e) => setFinalYear(e.target.value)} className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md bg-white">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          
          <button 
            onClick={handleFetchProvinsi} 
            disabled={loading || (user?.is_superuser && !selectedDistrict)} 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Memuat..." : "Ambil Data BPS"}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* INPUT FORMS BASED ON MODE */}
      {activeYears.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Input Data PDRB {selectedDistrict || "Kab/Kota"}</h2>
          
          {/* MODE: LQ */}
          {activeTab === "LQ" && provDataByYear[finalYear] && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Pilih Sektor Lapangan Usaha</label>
                <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                  {provDataByYear[finalYear].map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-semibold text-blue-800 border-b border-blue-200 pb-2 mb-3">Referensi Data Provinsi ({finalYear})</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-blue-600 font-medium">PDRB Sektor Tersebut (Provinsi)</label>
                      <div className="text-sm font-bold text-gray-800">
                        {provDataByYear[finalYear].find(p => p.label === selectedSector)?.value.toLocaleString("id-ID") || 0}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-blue-600 font-medium mt-2">Total PDRB (Provinsi)</label>
                      <div className="text-sm font-bold text-gray-800">
                        {provTotalByYear[finalYear]?.toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-3">Input Data Kabupaten/Kota ({finalYear})</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">PDRB Sektor Tersebut (Miliar Rp)</label>
                      <NumberInput value={(kokabData[finalYear] || {})[selectedSector] || ""} onChange={(val) => updateKokabData(finalYear, selectedSector, val)} className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Seluruh PDRB Kabupaten (Miliar Rp)</label>
                      <NumberInput value={totalKokab[finalYear] || ""} onChange={(val) => updateTotalKokab(finalYear, val)} className="mt-1 block w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={calculateLQ} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 w-full md:w-auto">Hitung LQ</button>
            </div>
          )}

          {/* MODE: SSA */}
          {activeTab === "SSA" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Pilih Sektor Lapangan Usaha</label>
                <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                  {(provDataByYear[activeYears[0]] || []).map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeYears.map(year => (
                  <div key={year} className="p-3 bg-gray-50 border rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">PDRB Sektor ({year}) <span className="text-xs font-normal">(Miliar Rp)</span></label>
                    <NumberInput value={(kokabData[year] || {})[selectedSector] || ""} onChange={(val) => updateKokabData(year, selectedSector, val)} className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-right" />
                    <div className="mt-2 text-xs text-gray-500 flex justify-between">
                      <span>Ref. Provinsi:</span>
                      <span className="font-semibold text-gray-700">
                        {provDataByYear[year]?.find(p => p.label === selectedSector)?.value.toLocaleString("id-ID") || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={calculateSSA} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 w-full md:w-auto">Hitung SSA Beruntun</button>
            </div>
          )}

          {/* MODE: KLASSEN */}
          {activeTab === "KLASSEN" && (
            <div className="space-y-4 overflow-x-auto">
              <p className="text-sm text-gray-600 mb-2">Isi semua PDRB Sektor Kabupaten Anda untuk seluruh rentang tahun {baseYear} - {finalYear}. Nilai PDRB Provinsi ditampilkan sebagai referensi.</p>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left sticky left-0 bg-gray-50 z-10 border-r w-48 md:w-64 min-w-[150px]">Sektor</th>
                    {activeYears.map(year => (
                      <th key={year} className="px-4 py-2 text-right min-w-[200px]">PDRB {year} <br/><span className="text-xs font-normal text-gray-500">(Miliar Rp)</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(provDataByYear[finalYear] || []).map((item, idx) => {
                    const isTitle = item.label.match(/^[A-Z]\s/);
                    return (
                      <tr key={idx} className={isTitle ? "font-bold bg-gray-100" : "hover:bg-gray-50"}>
                        <td className={`px-4 py-2 sticky left-0 bg-white border-r w-48 md:w-64 min-w-[150px] whitespace-normal ${isTitle ? 'bg-gray-100' : ''}`}>
                          <div className="text-xs sm:text-sm line-clamp-3" title={item.label}>
                            {item.label}
                          </div>
                        </td>
                        {activeYears.map(year => (
                          <td key={year} className="px-4 py-2 border-b">
                            <div className="flex flex-col space-y-1">
                              <NumberInput 
                                value={(kokabData[year] || {})[item.label] || ""} 
                                onChange={(val) => updateKokabData(year, item.label, val)} 
                                className="w-full border border-gray-300 rounded px-2 py-1 text-right focus:ring-blue-500 focus:border-blue-500" 
                              />
                              <div className="text-[10px] text-gray-500 text-right">
                                Prov: {provDataByYear[year]?.find(p => p.label === item.label)?.value.toLocaleString("id-ID") || 0}
                              </div>
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button onClick={calculateKlassen} className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">Hitung Klassen</button>
            </div>
          )}
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {/* LQ Result */}
      {activeTab === "LQ" && lqResult && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2 text-indigo-700">Hasil LQ - {lqResult.label}</h2>
          <div className="flex gap-4 items-center">
            <div className="text-3xl font-bold text-gray-800">{lqResult.lq.toFixed(2)}</div>
            <div>
              {lqResult.lq > 1 ? 
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">Sektor Basis</span> : 
                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-medium">Sektor Non-Basis</span>
              }
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {lqResult.lq > 1 ? "Sektor ini mampu memenuhi kebutuhan dalam daerah dan memiliki potensi ekspor ke luar daerah." : "Sektor ini belum mampu memenuhi kebutuhan dalam daerah (masih impor dari luar)."}
          </p>
        </div>
      )}

      {/* SSA Result */}
      {activeTab === "SSA" && ssaResults.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2 text-indigo-700">Hasil SSA - {selectedSector}</h2>
          
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Periode</th>
                  <th className="px-4 py-2 text-right">National Growth (NGE)</th>
                  <th className="px-4 py-2 text-right">Industry Mix (IME)</th>
                  <th className="px-4 py-2 text-right">Regional Share (RSE)</th>
                  <th className="px-4 py-2 text-right text-indigo-700">Total Shift</th>
                  <th className="px-4 py-2 text-center">Status / Keputusan</th>
                </tr>
              </thead>
              <tbody>
                {ssaResults.map((res, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-bold">{res.period}</td>
                    <td className="px-4 py-2 text-right">{res.NGE.toLocaleString("id-ID", {maximumFractionDigits:2})}</td>
                    <td className="px-4 py-2 text-right">{res.IME.toLocaleString("id-ID", {maximumFractionDigits:2})}</td>
                    <td className="px-4 py-2 text-right">{res.RSE.toLocaleString("id-ID", {maximumFractionDigits:2})}</td>
                    <td className="px-4 py-2 text-right font-bold text-indigo-700">{res.TotalShift.toLocaleString("id-ID", {maximumFractionDigits:2})}</td>
                    <td className="px-4 py-2 text-center">
                      {res.TotalShift > 0 
                        ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">Positif</span>
                        : <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">Negatif</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Klassen Result */}
      {activeTab === "KLASSEN" && klassenResults.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2 text-indigo-700">Hasil Tipologi Klassen</h2>
          
          <div className="h-[500px] w-full border rounded-lg p-4 bg-gray-50">
            <h3 className="text-center font-bold text-gray-700 mb-4">Grafik Kluster Tipologi Klassen ({baseYear} - {finalYear})</h3>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="g_ij" name="Pertumbuhan Daerah (g_ij)" 
                  label={{ value: 'Pertumbuhan PDRB Daerah (g_ij)', position: 'insideBottom', offset: -10 }} />
                <YAxis type="number" dataKey="s_ij" name="Kontribusi Daerah (s_ij)" 
                  label={{ value: 'Kontribusi PDRB Daerah (s_ij)', angle: -90, position: 'insideLeft' }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border shadow rounded text-xs">
                          <p className="font-bold border-b pb-1 mb-1">{data.label}</p>
                          <p>Kudran: {data.kuadran}</p>
                          <p>g_ij: {data.g_ij.toFixed(4)}</p>
                          <p>s_ij: {data.s_ij.toFixed(4)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x={klassenResults[0]?.g_i} stroke="red" strokeDasharray="3 3" label="Rata-rata Pertumbuhan Prov" />
                <ReferenceLine y={klassenResults[0]?.s_i} stroke="red" strokeDasharray="3 3" label="Rata-rata Kontribusi Prov" />
                <Scatter name="Sektor" data={klassenResults} fill="#4f46e5">
                  <LabelList dataKey="label" position="top" style={{ fontSize: '10px' }} />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Sektor</th>
                  <th className="px-4 py-2 text-left">Kuadran / Tipologi</th>
                </tr>
              </thead>
              <tbody>
                {klassenResults.map((res, i) => {
                  const subsector = subsectors.find(s => s.name === res.label);
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium flex items-center space-x-2">
                        <span className="text-xl" title={res.label}>{subsector?.icon || "📊"}</span>
                        <span>{res.label}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium
                        ${res.kuadran.includes("I") && !res.kuadran.includes("II") && !res.kuadran.includes("IV") ? "bg-green-100 text-green-800" : ""}
                        ${res.kuadran.includes("II") && !res.kuadran.includes("III") ? "bg-yellow-100 text-yellow-800" : ""}
                        ${res.kuadran.includes("III") ? "bg-blue-100 text-blue-800" : ""}
                        ${res.kuadran.includes("IV") ? "bg-red-100 text-red-800" : ""}
                      `}>
                        {res.kuadran}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SAVE CONFIRMATION MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg w-full max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Konfirmasi Simpan Data</h2>
            <p className="text-sm text-gray-600 mb-4 border-b pb-2">Data berikut akan disimpan secara permanen ke dalam database untuk <b>{selectedDistrict}</b>.</p>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-4">
              {Object.keys(kokabData).sort((a,b) => Number(b) - Number(a)).map(year => (
                <div key={year} className="mb-4">
                  <h3 className="font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">Tahun {year}</h3>
                  <ul className="text-sm space-y-1 mt-2 pl-2">
                    {Object.entries(kokabData[year]).filter(([_, val]) => val > 0).map(([sector, val]) => (
                      <li key={sector} className="flex justify-between border-b border-gray-50 pb-1">
                        <span className="text-gray-600 truncate w-3/4 pr-2" title={sector}>{sector}</span>
                        <span className="font-medium">{val.toLocaleString('id-ID')}</span>
                      </li>
                    ))}
                    {Object.entries(kokabData[year]).filter(([_, val]) => val > 0).length === 0 && (
                      <li className="text-gray-400 italic">Belum ada data sektor terisi</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t">
              <button 
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-medium"
              >
                Batal
              </button>
              <button 
                onClick={confirmSaveToDB}
                disabled={loading}
                className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md font-medium disabled:opacity-50"
              >
                {loading ? "Menyimpan..." : "Konfirmasi Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
