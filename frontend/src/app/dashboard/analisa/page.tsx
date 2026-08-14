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

const LEVEL1_PREFIX_REGEX = /^[A-Z](,[A-Z])*\s/;
const LEVEL3_CHILDREN = [
  "Tanaman Pangan", "Tanaman Hortikultura", "Tanaman Perkebunan", "Peternakan", "Jasa Pertanian dan Perburuan"
];
const LEVEL2_WITH_CHILDREN = "Pertanian, Peternakan, Perburuan, dan Jasa Pertanian";

const isLevel1 = (label: string) => LEVEL1_PREFIX_REGEX.test(label);

const NumberInput = ({ value, onChange, className }: { value: string | number | undefined, onChange: (val: string) => void, className?: string }) => {
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
    const cleaned = rawInput.replace(/[^\d,\.]/g, "");
    setDisplayValue(cleaned);
    
    const standardStr = cleaned.replace(/\./g, "").replace(/,/g, ".");
    onChange(standardStr);
  };

  const handleBlur = () => {
    if (displayValue) {
      const standardStr = displayValue.replace(/\./g, "").replace(/,/g, ".");
      const parsedNum = Number(standardStr);
      if (!isNaN(parsedNum)) {
        setDisplayValue(parsedNum.toLocaleString("id-ID"));
      }
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

export default function InputPdrbKabPage() {
  const { user } = useAuth();
  
  const [baseYear, setBaseYear] = useState("2021");
  const [finalYear, setFinalYear] = useState("2024");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [districts, setDistricts] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
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
  
  // State to hold Kokab input data
  // kokabData[year][sector]
  const [kokabData, setKokabData] = useState<Record<string, Record<string, number | undefined>>>({});

  // Array of years involved in the current analysis
  const [activeYears, setActiveYears] = useState<string[]>([]);
  const [allLabels, setAllLabels] = useState<string[]>([]);
  
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Load from LocalStorage & Database
  useEffect(() => {
    const fetchSavedData = async () => {
      if (!selectedDistrict) {
        setKokabData({});
        return;
      }
      
      const saved = localStorage.getItem(`pdrb_v3_${selectedDistrict}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.kokabData) setKokabData(parsed.kokabData);
        } catch(e) {}
      }
      
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE}/api/get-pdrb/?kab_name=${selectedDistrict}`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const json = await res.json();
          if (json.kokabData && Object.keys(json.kokabData).length > 0) {
            setKokabData(prev => ({ ...prev, ...json.kokabData }));
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
      localStorage.setItem(`pdrb_v3_${selectedDistrict}`, JSON.stringify({ kokabData }));
    }
  }, [kokabData, selectedDistrict]);

  // Auto-refresh BPS when Kokab changes
  useEffect(() => {
    if (user?.is_superuser && selectedDistrict && activeYears.length > 0) {
      handleFetchProvinsi();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict]);

  const fetchBpsData = async (year: string) => {
    let provCode = "3200000";
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

      return { sectors: allItems };
    }
    return { sectors: [] };
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
      setError("Silakan pilih Kabupaten/Kota terlebih dahulu.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const yearsToFetch = getYearsRange(baseYear, finalYear);
      const promises = yearsToFetch.map(y => fetchBpsData(y));
      const results = await Promise.all(promises);
      
      const newProvDataByYear: Record<string, any[]> = {};
      
      let maxLabels: string[] = [];
      
      yearsToFetch.forEach((y, idx) => {
        newProvDataByYear[y] = results[idx].sectors;
        if (results[idx].sectors.length > maxLabels.length) {
          maxLabels = results[idx].sectors.map((s: any) => s.label);
        }
      });
      
      // Move "Produk Domestik Bruto" to the top
      const pdrbIndex = maxLabels.findIndex(l => l.toLowerCase().includes("produk domestik bruto"));
      if (pdrbIndex > -1) {
        const pdrbLabel = maxLabels.splice(pdrbIndex, 1)[0];
        maxLabels.unshift(pdrbLabel);
      }
      
      setProvDataByYear(newProvDataByYear);
      setActiveYears(yearsToFetch);
      setAllLabels(maxLabels);

      setKokabData(prev => {
        const next = { ...prev };
        yearsToFetch.forEach(y => {
          if (!next[y]) next[y] = {};
        });
        return next;
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmSaveToDB = async () => {
    setLoading(true);
    try {
      const filteredKokabData: Record<string, any> = {};
      Object.keys(kokabData).forEach(year => {
        if (provDataByYear[year]) {
          const validSectors = provDataByYear[year].map(p => p.label);
          filteredKokabData[year] = {};
          Object.entries(kokabData[year]).forEach(([sector, val]) => {
            if (validSectors.includes(sector)) {
              filteredKokabData[year][sector] = val;
            }
          });
        } else {
          filteredKokabData[year] = kokabData[year];
        }
      });

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
          prov_name: selectedProvince,
          data: filteredKokabData,
          prov_data: provDataByYear
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
    let val: number | undefined = parseFloat(value);
    if (isNaN(val) || value === "") val = undefined;
    
    setKokabData(prev => ({
      ...prev,
      [year]: {
        ...(prev[year] || {}),
        [sector]: val
      }
    }));
  };

  const validateData = (year: string) => {
    const dataObj = kokabData[year] || {};
    const errors: string[] = [];
    
    // 1. Level 3 sum to Level 2
    let l3Sum = 0;
    let allL3Filled = true;
    for (const child of LEVEL3_CHILDREN) {
      if (dataObj[child] === undefined) allL3Filled = false;
      l3Sum += (dataObj[child] || 0);
    }
    
    const l2Val = dataObj[LEVEL2_WITH_CHILDREN];
    if (allL3Filled && l2Val !== undefined) {
      if (Math.abs(l3Sum - l2Val) > 0.1) {
        errors.push(`Subsektor ${LEVEL2_WITH_CHILDREN} (${l2Val.toLocaleString('id-ID')}) tidak konsisten dengan sub-subsektornya (${l3Sum.toLocaleString('id-ID')})`);
      }
    }
  
    // 2. Level 2 sum to Level 1
    let currentLevel1 = "";
    let currentLevel1Sum = 0;
    let allLevel2Filled = true;
    let hasLevel2 = false;
    
    let totalSectorsSum = 0;
    let allSectorsFilled = true;
  
    for (let i = 0; i < allLabels.length; i++) {
      const label = allLabels[i];
      if (label.toLowerCase().includes("produk domestik bruto")) {
        continue;
      }
      
      if (isLevel1(label)) {
        if (currentLevel1 && hasLevel2) {
           if (allLevel2Filled && dataObj[currentLevel1] !== undefined) {
              const expected = dataObj[currentLevel1] || 0;
              if (Math.abs(currentLevel1Sum - expected) > 0.1) {
                errors.push(`Sektor ${currentLevel1} (${expected.toLocaleString('id-ID')}) tidak konsisten dengan subsektornya (${currentLevel1Sum.toLocaleString('id-ID')})`);
              }
           }
        }
        
        currentLevel1 = label;
        currentLevel1Sum = 0;
        allLevel2Filled = true;
        hasLevel2 = false;
        
        if (dataObj[label] === undefined) {
           allSectorsFilled = false;
        }
        totalSectorsSum += (dataObj[label] || 0);
        
      } else if (!LEVEL3_CHILDREN.includes(label)) {
        hasLevel2 = true;
        if (dataObj[label] === undefined) {
          allLevel2Filled = false;
        }
        currentLevel1Sum += (dataObj[label] || 0);
      }
    }
    
    if (currentLevel1 && hasLevel2) {
       if (allLevel2Filled && dataObj[currentLevel1] !== undefined) {
          const expected = dataObj[currentLevel1] || 0;
          if (Math.abs(currentLevel1Sum - expected) > 0.1) {
            errors.push(`Sektor ${currentLevel1} (${expected.toLocaleString('id-ID')}) tidak konsisten dengan subsektornya (${currentLevel1Sum.toLocaleString('id-ID')})`);
          }
       }
    }
  
    // 3. Level 1 sum to Grand Total
    const grandTotalLabel = allLabels.find(l => l.toLowerCase().includes("produk domestik bruto"));
    if (grandTotalLabel && dataObj[grandTotalLabel] !== undefined && allSectorsFilled) {
       const gt = dataObj[grandTotalLabel] || 0;
       if (Math.abs(totalSectorsSum - gt) > 0.1) {
          errors.push(`Grand Total PDRB (${gt.toLocaleString('id-ID')}) tidak sama dengan jumlah Sektor Utama (${totalSectorsSum.toLocaleString('id-ID')})`);
       }
    }
  
    return errors;
  };

  return (
    <div className="space-y-6 max-w-full mx-auto pb-10 px-4 md:px-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Input Data PDRB Kabupaten/Kota</h1>
          <p className="text-sm text-gray-500 mt-1">Masukkan data PDRB berdasarkan sektor, subsektor, dan total PDRB (Produk Domestik Bruto).</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        {/* District Selection */}
        <div className="border-b pb-4 flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
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
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 ${user?.is_superuser ? 'bg-white' : 'bg-gray-100 cursor-not-allowed text-gray-700'}`}
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
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 ${user?.is_superuser && selectedProvince ? 'bg-white' : 'bg-gray-100 cursor-not-allowed text-gray-700'}`}
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
              onClick={() => setShowSaveModal(true)} 
              disabled={loading || !selectedDistrict} 
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center space-x-2 shadow-sm"
            >
              <span>Simpan Permanen ke Database</span>
            </button>
          </div>
        </div>

        {/* Configurations */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tahun Awal</label>
            <select value={baseYear} onChange={(e) => setBaseYear(e.target.value)} className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Tahun Akhir</label>
            <select value={finalYear} onChange={(e) => setFinalYear(e.target.value)} className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          
          <button 
            onClick={handleFetchProvinsi} 
            disabled={loading || (user?.is_superuser && !selectedDistrict)} 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Memuat..." : "Tampilkan Tabel / Ambil Referensi BPS"}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {activeYears.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 overflow-hidden">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-semibold">Tabel Input PDRB {selectedDistrict || "Kab/Kota"}</h2>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Otomatis Validasi Konsistensi</span>
          </div>
          
          <div className="flex flex-col gap-4 mb-4">
             {activeYears.map(year => {
                const errors = validateData(year);
                if (errors.length === 0) return null;
                return (
                  <div key={year} className="bg-red-50 p-3 rounded-md border border-red-200">
                     <p className="text-sm font-semibold text-red-800 mb-1">Peringatan Konsistensi Data Tahun {year}:</p>
                     <ul className="list-disc pl-5 text-xs text-red-700">
                        {errors.map((err, idx) => <li key={idx}>{err}</li>)}
                     </ul>
                  </div>
                )
             })}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-4 py-3 text-left sticky left-0 bg-slate-100 z-10 border-r border-slate-200 w-64 min-w-[250px] shadow-sm font-semibold text-slate-700">Sektor / Lapangan Usaha</th>
                  {activeYears.map(year => (
                    <th key={year} className="px-4 py-3 text-right min-w-[200px] border-r border-slate-200 font-semibold text-slate-700">PDRB {year} <br/><span className="text-xs font-normal text-slate-500">(Miliar Rp)</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allLabels.map((label, idx) => {
                  const isLevel1Sector = isLevel1(label);
                  const isGrandTotal = label.toLowerCase().includes("produk domestik bruto");
                  const isLevel3 = LEVEL3_CHILDREN.includes(label);
                  
                  let rowClass = "hover:bg-blue-50/30 border-b border-slate-100";
                  if (isLevel1Sector) rowClass = "bg-slate-50 border-b border-slate-200";
                  if (isGrandTotal) rowClass = "bg-blue-50 border-t-2 border-blue-200 font-bold";
                  
                  let labelClass = "text-sm text-slate-700";
                  if (isLevel1Sector || isGrandTotal) labelClass = "font-bold text-slate-900";
                  if (isLevel3) labelClass = "text-sm text-slate-500 pl-4";
                  else if (!isLevel1Sector && !isGrandTotal) labelClass = "text-sm text-slate-600 pl-2";

                  return (
                    <tr key={idx} className={rowClass}>
                      <td className={`px-4 py-2 sticky left-0 z-10 border-r border-slate-200 w-64 min-w-[250px] ${isGrandTotal ? 'bg-blue-50' : (isLevel1Sector ? 'bg-slate-50' : 'bg-white')}`}>
                        <div className={`line-clamp-3 ${labelClass}`} title={label}>
                          {label}
                        </div>
                      </td>
                      {activeYears.map(year => (
                        <td key={year} className="px-4 py-2 border-r border-slate-200 bg-white">
                          <div className="flex flex-col space-y-1">
                            <NumberInput 
                              value={(kokabData[year] || {})[label]} 
                              onChange={(val) => updateKokabData(year, label, val)} 
                              className={`w-full border rounded px-2 py-1.5 text-right transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isLevel1Sector || isGrandTotal ? 'border-slate-300 font-semibold bg-slate-50' : 'border-slate-200 bg-white'}`} 
                            />
                            <div className="text-[10px] text-slate-400 text-right">
                              Prov: {provDataByYear[year]?.find(p => p.label === label)?.value.toLocaleString("id-ID") || 0}
                            </div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Simpan Perubahan?</h3>
            <p className="text-gray-600 text-sm mb-6">
              Data yang telah Anda isi akan disimpan secara permanen di database pusat. Pastikan seluruh struktur sektor dan subsektor tidak ada peringatan konsistensi.
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Batal</button>
              <button onClick={confirmSaveToDB} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
                {loading ? "Menyimpan..." : "Simpan Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
