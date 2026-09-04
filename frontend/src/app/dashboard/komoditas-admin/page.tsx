"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Save, RefreshCw, Search, ChevronRight, ChevronDown, Check, AlertCircle, Layers } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

const YEARS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019"];

export default function KomoditasAdminPage() {
  const { user } = useAuth();
  
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedLevel, setSelectedLevel] = useState<"kabupaten" | "kecamatan">("kabupaten");
  const [selectedKecamatan, setSelectedKecamatan] = useState("");

  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [kecamatans, setKecamatans] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  
  const [productionValues, setProductionValues] = useState<Record<string, string>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load locations and commodities
  useEffect(() => {
    const initData = async () => {
      try {
        setLoadingLocations(true);
        const token = localStorage.getItem("access_token");
        const authHeaders: HeadersInit = token ? { "Authorization": `Bearer ${token}` } : {};

        const provRes = await fetch("/api/provinces", { headers: authHeaders });
        const provData = await provRes.json();
        const provList = Array.isArray(provData) ? provData : (provData.results || []);
        setProvinces(provList.sort((a: any, b: any) => a.name.localeCompare(b.name)));

        const distRes = await fetch("/api/districts", { headers: authHeaders });
        const distData = await distRes.json();
        const distList = Array.isArray(distData) ? distData : (distData.results || []);
        setDistricts(distList.sort((a: any, b: any) => a.name.localeCompare(b.name)));

        const comRes = await fetch(`/api/commodities?t=${new Date().getTime()}`, { headers: authHeaders });
        const comData = await comRes.json();
        const comList = Array.isArray(comData) ? comData : (comData.results || []);
        comList.sort((a: any, b: any) => a.name.localeCompare(b.name));
        console.log("FIRST COMMODITY:", comList[0]);
        setCommodities(comList);
        
        // Auto select if regular user
        if (user && !user.is_superuser) {
          if (user.profile?.asal_provinsi) {
            setSelectedProvince(user.profile.asal_provinsi);
            const matchedProv = provList.find((p: any) => p.name === user.profile.asal_provinsi);
            if (matchedProv) {
              const filteredDists = distList.filter((d: any) => d.province === matchedProv.id);
              setDistricts(filteredDists.sort((a: any, b: any) => a.name.localeCompare(b.name)));
            }
          }
          if (user.profile?.asal_kokab) {
            setSelectedDistrict(user.profile.asal_kokab);
          }
        }
      } catch (err) {
        console.error("Error loading locations:", err);
      } finally {
        setLoadingLocations(false);
      }
    };
    if (user) {
      initData();
    }
  }, [user]);

  // Load districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      const matchedProv = provinces.find((p: any) => p.name === selectedProvince);
      if (matchedProv) {
        const token = localStorage.getItem("access_token");
        const authHeaders: HeadersInit = token ? { "Authorization": `Bearer ${token}` } : {};
        fetch("/api/districts", { headers: authHeaders })
          .then(res => res.json())
          .then(data => {
            const distList = Array.isArray(data) ? data : (data.results || []);
            const filtered = distList.filter((d: any) => d.province === matchedProv.id);
            setDistricts(filtered.sort((a: any, b: any) => a.name.localeCompare(b.name)));
          })
          .catch(err => console.error("Error fetching districts:", err));
      }
    }
  }, [selectedProvince]);

  // Load subdistricts (kecamatan) when district (kabupaten) changes
  useEffect(() => {
    const fetchKecamatan = async () => {
      if (!selectedDistrict) {
        setKecamatans([]);
        return;
      }
      const matchedDist = districts.find((d: any) => d.name === selectedDistrict);
      if (matchedDist) {
        try {
          const token = localStorage.getItem("access_token");
          const authHeaders: HeadersInit = token ? { "Authorization": `Bearer ${token}` } : {};
          const res = await fetch("/api/subdistricts", { headers: authHeaders });
          const data = await res.json();
          const subdistList = Array.isArray(data) ? data : (data.results || []);
          const filtered = subdistList.filter((s: any) => s.district === matchedDist.id);
          setKecamatans(filtered.sort((a: any, b: any) => a.name.localeCompare(b.name)));
          setSelectedKecamatan("");
        } catch (err) {
          console.error("Error fetching kecamatan:", err);
        }
      }
    };
    fetchKecamatan();
  }, [selectedDistrict]);

  // Load production values
  useEffect(() => {
    const fetchProductionData = async () => {
      if (!selectedDistrict || !selectedYear) return;
      if (selectedLevel === "kecamatan" && !selectedKecamatan) {
        setProductionValues({});
        setInitialValues({});
        return;
      }

      setLoadingData(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      try {
        let url = `/api/get-production?kab_name=${encodeURIComponent(selectedDistrict)}&year=${selectedYear}`;
        if (selectedLevel === "kecamatan" && selectedKecamatan) {
          url += `&kec_name=${encodeURIComponent(selectedKecamatan)}`;
        }
        
        const token = localStorage.getItem("access_token");
        const res = await fetch(url, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        
        // 404 = belum ada data → form kosong siap diisi pertama kali
        if (res.status === 404 || !res.ok) {
          setProductionValues({});
          setInitialValues({});
          return;
        }

        const json = await res.json();
        if (json.data && Object.keys(json.data).length > 0) {
          const values: Record<string, string> = {};
          Object.entries(json.data).forEach(([comId, val]: [string, any]) => {
            values[comId] = String(val);
          });
          setProductionValues(values);
          setInitialValues(values);
        } else {
          setProductionValues({});
          setInitialValues({});
        }
      } catch (err) {
        // Network/parse error — silently show empty form
        console.warn("Could not load prior production data:", err);
        setProductionValues({});
        setInitialValues({});
      } finally {
        setLoadingData(false);
      }
    };

    fetchProductionData();
  }, [selectedDistrict, selectedYear, selectedLevel, selectedKecamatan]);

  // Group commodities by Kelompok Utama and Subkelompok
  const groupedCommodities: Record<string, Record<string, any[]>> = {};
  
  commodities.forEach(c => {
    const kelompok = c.kelompok_utama || "Tanpa Kelompok";
    const subkelompok = c.subkelompok || "Tanpa Subkelompok";
    
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return;
    }

    if (!groupedCommodities[kelompok]) {
      groupedCommodities[kelompok] = {};
    }
    if (!groupedCommodities[kelompok][subkelompok]) {
      groupedCommodities[kelompok][subkelompok] = [];
    }
    groupedCommodities[kelompok][subkelompok].push(c);
  });

  // Auto-expand search matches
  useEffect(() => {
    if (searchQuery) {
      const newExpanded: Record<string, boolean> = {};
      Object.keys(groupedCommodities).forEach(k => {
        newExpanded[k] = true;
      });
      setExpandedGroups(newExpanded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleInputChange = (commodityId: number, value: string) => {
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setProductionValues(prev => ({
        ...prev,
        [commodityId]: value
      }));
    }
  };

  const isDirty = JSON.stringify(productionValues) !== JSON.stringify(initialValues);

  const handleSave = async () => {
    if (!selectedDistrict || !selectedYear) return;
    if (selectedLevel === "kecamatan" && !selectedKecamatan) {
      setErrorMsg("Pilih kecamatan terlebih dahulu.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payloadData: Record<string, number> = {};
    Object.entries(productionValues).forEach(([comId, val]) => {
      if (val !== "") {
        payloadData[comId] = parseFloat(val);
      }
    });

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/save-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify({
          type: "production",
          kab_name: selectedDistrict,
          kec_name: selectedLevel === "kecamatan" ? selectedKecamatan : null,
          year: parseInt(selectedYear),
          data: payloadData
        })
      });

      const json = await res.json();
      if (res.ok && json.status === "success") {
        setSuccessMsg(json.message || "Data produksi berhasil disimpan.");
        setInitialValues({ ...productionValues });
      } else {
        throw new Error(json.message || "Terjadi kesalahan saat menyimpan data.");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const totalCommoditiesToShow = Object.values(groupedCommodities).reduce((acc, sub) => {
    return acc + Object.values(sub).reduce((subAcc, items) => subAcc + items.length, 0);
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 relative">
      <div className="flex flex-col gap-2">
        <span className="eyebrow text-blue-600">Manajemen Data • Komoditas</span>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Input Angka Produksi Komoditas</h1>
        <p className="text-slate-500 max-w-2xl">
          Masukkan angka produksi komoditas di tingkat Kabupaten/Kota atau Kecamatan untuk dihitung status unggulannya (LQ).
        </p>
      </div>

      {/* Filter Selection Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Provinsi */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Provinsi</label>
            <SearchableSelect
              className={`w-full text-sm font-bold text-slate-700 bg-transparent border-b border-slate-200 pb-1.5 outline-none focus:border-blue-500 transition-colors ${
                user?.is_superuser || !user?.profile?.asal_provinsi ? "cursor-pointer" : ""
              }`}
              value={selectedProvince}
              onChange={(val) => {
                setSelectedProvince(String(val));
                setSelectedDistrict("");
              }}
              disabled={(!user?.is_superuser && !!user?.profile?.asal_provinsi) || loadingLocations}
              options={provinces.map(p => ({ label: p.name, value: p.name }))}
              placeholder="-- Pilih Provinsi --"
            />
          </div>

          {/* Kabupaten / Kota */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kabupaten / Kota</label>
            <SearchableSelect
              className={`w-full text-sm font-bold text-slate-700 bg-transparent border-b border-slate-200 pb-1.5 outline-none focus:border-blue-500 transition-colors ${
                (user?.is_superuser || !user?.profile?.asal_kokab) && selectedProvince ? "cursor-pointer" : ""
              }`}
              value={selectedDistrict}
              onChange={(val) => setSelectedDistrict(String(val))}
              disabled={(!user?.is_superuser && !!user?.profile?.asal_kokab) || !selectedProvince || loadingLocations}
              options={districts.map(d => ({ label: d.name, value: d.name }))}
              placeholder="-- Pilih Kokab --"
            />
          </div>

          {/* Tahun */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tahun Produksi</label>
            <SearchableSelect
              className="w-full text-sm font-bold text-slate-700 bg-transparent border-b border-slate-200 pb-1.5 outline-none focus:border-blue-500 transition-colors cursor-pointer"
              value={selectedYear}
              onChange={(val) => setSelectedYear(String(val))}
              options={YEARS.map(y => ({ label: String(y), value: String(y) }))}
              placeholder="Tahun Produksi"
            />
          </div>

          {/* Level Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Level Input</label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setSelectedLevel("kabupaten")}
                className={`flex-1 py-1 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  selectedLevel === "kabupaten"
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Kabupaten/Kota
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevel("kecamatan")}
                className={`flex-1 py-1 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  selectedLevel === "kecamatan"
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Kecamatan
              </button>
            </div>
          </div>
        </div>

        {/* Kecamatan Sub-Filter */}
        {selectedLevel === "kecamatan" && selectedDistrict && (
          <div className="flex flex-col gap-1.5 max-w-xs pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pilih Kecamatan</label>
            <SearchableSelect
              className="w-full text-sm font-bold text-slate-700 bg-transparent border-b border-slate-200 pb-1.5 outline-none focus:border-blue-500 transition-colors cursor-pointer"
              value={selectedKecamatan}
              onChange={(val) => setSelectedKecamatan(String(val))}
              options={kecamatans.map(k => ({ label: k.name, value: k.name }))}
              placeholder="-- Pilih Kecamatan --"
            />
          </div>
        )}
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3.5 rounded-xl flex items-center gap-2 text-sm">
          <Check size={18} className="text-emerald-500 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3.5 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="text-rose-500 flex-shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Input Data Panel */}
      {selectedDistrict && (selectedLevel === "kabupaten" || selectedKecamatan) ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Header & Search */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="font-bold text-slate-800">
                Formulir Angka Produksi {selectedLevel === "kecamatan" ? `Kecamatan ${selectedKecamatan}` : `Kabupaten/Kota ${selectedDistrict}`}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Silakan masukkan angka produksi dalam satuan ton/satuan wilayah setempat.</p>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari komoditas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Form Content */}
          {loadingData ? (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw size={24} className="animate-spin text-blue-600" />
              <span className="text-sm">Memuat data form...</span>
            </div>
          ) : totalCommoditiesToShow === 0 ? (
            <div className="p-20 text-center text-slate-400 italic text-sm">
              Tidak ada komoditas ditemukan {searchQuery && "untuk pencarian ini"}.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {Object.entries(groupedCommodities).map(([kelompok, subGroups]) => {
                const isExpanded = expandedGroups[kelompok] !== false;
                return (
                  <div key={kelompok} className="flex flex-col">
                    {/* Kelompok Utama Header */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(kelompok)}
                      className="w-full flex items-center justify-between p-4 font-bold text-slate-800 bg-slate-50/30 hover:bg-slate-50/70 border-b border-slate-100 text-left transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 text-sm uppercase tracking-wider text-slate-600">
                        <Layers size={16} className="text-blue-500" />
                        {kelompok}
                      </span>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>

                    {/* Subkelompok and Commodities List */}
                    {isExpanded && (
                      <div className="p-4 space-y-6">
                        {Object.entries(subGroups).map(([subkelompok, items]) => (
                          <div key={subkelompok} className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-1">
                              {subkelompok}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {items.map(item => (
                                <div 
                                  key={item.id}
                                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors bg-slate-50/20"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                                    {item.icon && <span className="text-xs text-slate-400 mt-0.5">{item.icon} Icon</span>}
                                  </div>
                                  
                                  {/* Input Field */}
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-28 relative">
                                      <input
                                        type="text"
                                        value={productionValues[item.id] || ""}
                                        onChange={(e) => handleInputChange(item.id, e.target.value)}
                                        placeholder="0"
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-right font-mono font-bold text-slate-700 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                                      />
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">ton</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 max-w-2xl mx-auto flex flex-col items-center gap-2">
          <Layers size={36} className="text-slate-300" />
          <h3 className="font-bold text-slate-700">Silakan pilih wilayah dan level input</h3>
          <p className="text-sm max-w-sm">
            Tentukan Provinsi, Kabupaten/Kota, Tahun, serta Level Input (Kabupaten atau Kecamatan) pada panel pilihan di atas untuk memuat formulir angka produksi.
          </p>
        </div>
      )}

      {/* Sticky Bottom Actions Bar */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-slate-200 px-6 py-4 rounded-2xl shadow-xl z-40 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-xs font-semibold text-slate-600">Ada perubahan yang belum disimpan</span>
          <button
            type="button"
            onClick={() => setProductionValues({ ...initialValues })}
            disabled={saving}
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-semibold cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              <Save size={14} />
            )}
            Simpan Perubahan
          </button>
        </div>
      )}
    </div>
  );
}
