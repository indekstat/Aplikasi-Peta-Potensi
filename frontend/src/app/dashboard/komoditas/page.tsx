'use client';

import { useState, useEffect, useMemo } from 'react';
import { IndeksMap } from 'indeksmaps';
import { Layers, MapPin, TrendingUp, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const YEARS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019"];

const isMatchingDistrict = (geojsonName: string, dbName: string) => {
  if (!geojsonName || !dbName) return false;
  const clean = (s: string) => s.toLowerCase()
    .replace(/kabupaten|kota/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  return clean(geojsonName) === clean(dbName);
};

const isMatchingKecamatan = (geojsonName: string, dbName: string) => {
  if (!geojsonName || !dbName) return false;
  const clean = (s: string) => s.toLowerCase()
    .replace(/kecamatan/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  return clean(geojsonName) === clean(dbName);
};

export default function KomoditasUnggulan() {
  const { user } = useAuth();
  
  const [selectedProvince, setSelectedProvince] = useState<string>("Jawa Timur");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [selectedCommodity, setSelectedCommodity] = useState<string>("");

  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [districtGeoJSON, setDistrictGeoJSON] = useState<any>(null);
  
  const [lqProdData, setLqProdData] = useState<any[]>([]);
  const [loadingMap, setLoadingMap] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load provinces and districts metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const provRes = await fetch('/api/provinces');
        const provData = await provRes.json();
        setProvinces(provData.sort((a: any, b: any) => a.name.localeCompare(b.name)));

        const distRes = await fetch('/api/districts');
        const distData = await distRes.json();
        setDistricts(distData.sort((a: any, b: any) => a.name.localeCompare(b.name)));

        // Default settings for user
        if (user && !user.is_superuser) {
          if (user.profile?.asal_provinsi) {
            setSelectedProvince(user.profile.asal_provinsi);
            const matchedProv = provData.find((p: any) => p.name === user.profile.asal_provinsi);
            if (matchedProv) {
              const filteredDists = distData.filter((d: any) => d.province === matchedProv.id);
              setDistricts(filteredDists.sort((a: any, b: any) => a.name.localeCompare(b.name)));
            }
          }
          if (user.profile?.asal_kokab) {
            setSelectedDistrict(user.profile.asal_kokab);
          }
        }
      } catch (err) {
        console.error('Failed to load location metadata:', err);
      }
    };
    if (user) {
      fetchMetadata();
    }
  }, [user]);

  // Sync districts for superadmin when province changes
  useEffect(() => {
    if (user?.is_superuser && selectedProvince) {
      const matchedProv = provinces.find((p: any) => p.name === selectedProvince);
      if (matchedProv) {
        fetch("/api/districts")
          .then(res => res.json())
          .then(data => {
            const filtered = data.filter((d: any) => d.province === matchedProv.id);
            setDistricts(filtered.sort((a: any, b: any) => a.name.localeCompare(b.name)));
          });
      }
    }
  }, [selectedProvince, user]);

  // Fetch GeoJSON (Kecamatan boundaries for the selected district)
  useEffect(() => {
    if (!selectedDistrict) {
      setDistrictGeoJSON(null);
      return;
    }
    setLoadingMap(true);
    fetch(`/api/maps/kecamatan?kab_name=${encodeURIComponent(selectedDistrict)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load IDN_3 Map');
        return res.json();
      })
      .then(data => {
        setDistrictGeoJSON(data);
      })
      .catch(err => {
        console.error('Failed to load district GeoJSON:', err);
      })
      .finally(() => {
        setLoadingMap(false);
      });
  }, [selectedDistrict]);

  // Fetch LQ analysis data
  useEffect(() => {
    const fetchLqData = async () => {
      if (!selectedDistrict || !selectedYear) return;
      setLoadingData(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/analysis/lq?year=${selectedYear}`);
        const data = await res.json();
        
        // Filter lq_prod specifically for our selected district
        const filtered = (data.lq_prod || []).filter((item: any) => 
          isMatchingDistrict(item.kabupaten, selectedDistrict)
        );
        setLqProdData(filtered);
      } catch (err) {
        console.error('Error fetching LQ data:', err);
        setErrorMsg('Gagal memuat hasil analisis komoditas.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchLqData();
  }, [selectedDistrict, selectedYear]);

  // Filter GeoJSON to selected Kabupaten and map properties
  const geoJSONData = useMemo(() => {
    if (!districtGeoJSON || !selectedDistrict) return null;

    // Style and inject data
    const styledFeatures = districtGeoJSON.features.map((f: any) => {
      const kecName = f.properties.NAME_3 || "";
      const kecUnggulans = lqProdData.filter(item => {
        const matchKec = isMatchingKecamatan(item.kecamatan, kecName);
        const matchCom = selectedCommodity ? item.komoditas === selectedCommodity : true;
        return matchKec && item.is_unggulan && matchCom;
      });
      
      const hasUnggulan = kecUnggulans.length > 0;
      
      return {
        ...f,
        properties: {
          ...f.properties,
          NAME_2: f.properties.NAME_2,
          NAME_3: kecName,
          fill: hasUnggulan ? '#0066ff' : '#e2e8f0', // Royal Blue if unggulan, gray otherwise
          stroke: '#ffffff',
          strokeWidth: 0.8,
          unggulan: kecUnggulans,
          isSelected: true
        }
      };
    });

    return { ...districtGeoJSON, features: styledFeatures };
  }, [districtGeoJSON, selectedDistrict, lqProdData, selectedCommodity]);

  const uniqueCommoditiesList = useMemo(() => {
    // Collect all commodities that have been inputted
    const coms = new Set(lqProdData.map(x => x.komoditas));
    return Array.from(coms).sort();
  }, [lqProdData]);

  // Summary statistics
  const totalKecamatan = useMemo(() => {
    if (!geoJSONData) return 0;
    return geoJSONData.features.length;
  }, [geoJSONData]);

  const kecamatanUnggulanCount = useMemo(() => {
    const uniqueKec = new Set(lqProdData.filter(x => x.is_unggulan).map(x => x.kecamatan));
    return uniqueKec.size;
  }, [lqProdData]);

  const uniqueCommoditiesCount = useMemo(() => {
    const uniqueCom = new Set(lqProdData.filter(x => x.is_unggulan).map(x => x.komoditas));
    return uniqueCom.size;
  }, [lqProdData]);

  // Group LQ data by Kecamatan for the list representation
  const groupedByKecamatan = useMemo(() => {
    const groups: Record<string, any[]> = {};
    lqProdData.forEach(item => {
      if (item.is_unggulan) {
        if (!groups[item.kecamatan]) {
          groups[item.kecamatan] = [];
        }
        groups[item.kecamatan].push(item);
      }
    });
    return groups;
  }, [lqProdData]);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full pb-10">
      
      {/* Header Panel */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col gap-2">
          <span className="eyebrow text-blue-600">Analisis Wilayah • Komoditas</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
            Peta Komoditas Unggulan
          </h1>
          <p className="text-slate-500 max-w-2xl">
            Tinjau sebaran komoditas unggulan daerah di tingkat kecamatan berdasarkan analisis Location Quotient (LQ) data produksi riil terinput.
          </p>
        </div>

        {/* Filter Selection Controls */}
        <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          {/* Provinsi */}
          {user?.is_superuser && (
            <div className="flex flex-col gap-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Provinsi</label>
              <select
                className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer border-b pb-0.5"
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setSelectedDistrict("");
                }}
              >
                <option value="" disabled>-- Pilih Provinsi --</option>
                {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Kabupaten / Kota */}
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Kabupaten / Kota</label>
            {user?.is_superuser ? (
              <select
                className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer border-b pb-0.5"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={!selectedProvince}
              >
                <option value="" disabled>-- Pilih Kokab --</option>
                {districts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            ) : (
              <div className="text-xs font-bold text-slate-700">{selectedDistrict || 'Memuat...'}</div>
            )}
          </div>

          {/* Tahun */}
          <div className="flex flex-col gap-1 min-w-[80px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Tahun</label>
            <select
              className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer border-b pb-0.5"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Komoditas Filter */}
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Filter Komoditas</label>
            <select
              className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer border-b pb-0.5"
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
            >
              <option value="">Semua Komoditas</option>
              {uniqueCommoditiesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Summary Row */}
      {selectedDistrict && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Kecamatan Terdata', value: loadingData ? '-' : totalKecamatan, icon: <MapPin size={24} className="text-blue-600"/> },
            { label: 'Kecamatan dengan Unggulan', value: loadingData ? '-' : kecamatanUnggulanCount, icon: <Layers size={24} className="text-emerald-600"/> },
            { label: 'Komoditas Unggulan Teridentifikasi', value: loadingData ? '-' : uniqueCommoditiesCount, icon: <TrendingUp size={24} className="text-indigo-600"/> },
          ].map((item, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                {item.icon}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-0.5">{item.label}</div>
                <div className="text-xl font-bold text-slate-800">{item.value}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={16} className="text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {selectedDistrict ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">Peta Spasial Kecamatan ({selectedDistrict})</h2>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded">Tingkat Kecamatan</span>
              </div>
              
              <div className="w-full relative h-[450px] bg-slate-50 border-b border-slate-100 flex items-center justify-center">
                {loadingMap || loadingData ? (
                  <div className="text-center flex flex-col items-center gap-2 text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-blue-600" />
                    <span className="text-sm">Memuat data spasial kecamatan...</span>
                  </div>
                ) : geoJSONData && geoJSONData.features.length > 0 ? (
                  <div className="w-full h-full p-4 flex items-center justify-center">
                    <IndeksMap
                      data={geoJSONData}
                      width={800}
                      height={400}
                      padding={30}
                      enableZoomPan={true}
                      defaultFill="#f1f5f9"
                      hoverFill="#3b82f6"
                      strokeColor="#ffffff"
                      strokeWidth={1}
                      renderTooltip={(feature) => {
                        const unggulans = feature.properties.unggulan || [];
                        return (
                          <div className="bg-slate-950/95 backdrop-blur-sm text-white p-3.5 rounded-xl shadow-xl border border-slate-800 min-w-[200px] leading-relaxed">
                            <strong className="block text-blue-400 mb-1 border-b border-slate-800 pb-1 text-sm">
                              Kec. {feature.properties.NAME_3}
                            </strong>
                            {unggulans.length === 0 ? (
                              <div className="text-[11px] text-slate-400 italic mt-1">Tidak ada komoditas unggulan</div>
                            ) : (
                              <div className="mt-2 space-y-1">
                                <div className="text-[10px] text-slate-500 font-semibold mb-1 uppercase">Komoditas Unggulan:</div>
                                {unggulans.map((u: any, idx: number) => (
                                  <div key={idx} className="text-xs flex justify-between gap-4">
                                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                                      {u.icon && <span className="text-sm">{u.icon}</span>}
                                      {u.komoditas}
                                    </span>
                                    <span className="font-bold text-amber-400">LQ: {u.lq.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center text-slate-400 italic text-sm">
                    Gagal memuat peta kecamatan untuk {selectedDistrict}.
                  </div>
                )}
              </div>
              
              {/* Legend Footer */}
              <div className="p-4 bg-white border-t border-slate-100 text-xs flex items-center justify-end gap-4">
                <span className="text-slate-500 font-semibold">Keterangan Wilayah:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-[#0066ff] rounded border"></div> Memiliki Komoditas Unggulan
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-[#e2e8f0] rounded border border-slate-300"></div> Tidak Ada / Belum Diinput
                </div>
              </div>
            </section>
          </div>

          {/* List Column */}
          <div className="flex flex-col gap-6">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[520px]">
              <div className="p-5 border-b border-slate-100 bg-slate-50">
                <h2 className="font-bold text-slate-800">Daftar Komoditas Unggulan</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {loadingData ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">Memuat daftar...</div>
                ) : Object.keys(groupedByKecamatan).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 gap-2">
                    <Layers size={28} className="text-slate-300" />
                    <span className="text-sm font-semibold">Belum ada komoditas unggulan</span>
                    <span className="text-xs text-slate-400 max-w-[200px]">Data produksi komoditas belum diinput atau LQ &le; 1</span>
                  </div>
                ) : (
                  Object.entries(groupedByKecamatan).sort((a, b) => a[0].localeCompare(b[0])).map(([kecName, items]) => (
                    <div key={kecName} className="border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                      <div className="text-xs font-bold text-slate-800 border-b pb-1.5 mb-2 flex items-center gap-1">
                        <MapPin size={12} className="text-blue-500" />
                        Kec. {kecName}
                      </div>
                      <div className="space-y-1.5">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-xs">
                            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                              {item.icon && <span>{item.icon}</span>}
                              {item.komoditas}
                            </span>
                            <span className="font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                              LQ: {item.lq.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 max-w-2xl mx-auto flex flex-col items-center gap-2">
          <Layers size={36} className="text-slate-300" />
          <h3 className="font-bold text-slate-700">Silakan pilih Kabupaten / Kota</h3>
          <p className="text-sm max-w-sm">
            Tentukan Provinsi dan Kabupaten/Kota pada filter di atas untuk melihat peta sebaran komoditas unggulan tingkat kecamatan.
          </p>
        </div>
      )}
    </div>
  );
}
