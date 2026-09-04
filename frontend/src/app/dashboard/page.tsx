'use client';
import { useState, useEffect, useMemo } from 'react';
import { IndeksMap } from 'indeksmaps';
import { Building2, Layers, MapPin, TrendingUp, ArrowRight, PieChart, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

const isMatchingDistrict = (geojsonName: string, dbName: string) => {
  if (!geojsonName || !dbName) return false;
  const clean = (s: string) => s.toLowerCase()
    .replace(/kabupaten|kota/g, '')
    .replace(/[^a-z0-9]/g, '');
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

export default function Beranda() {
  const { user } = useAuth();
  const [fullGeoJSON, setFullGeoJSON] = useState<any>(null);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('JAWA TIMUR');
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  
  const [statsData, setStatsData] = useState<any>(null);
  const [lqSummary, setLqSummary] = useState<any[]>([]);
  const [klassenData, setKlassenData] = useState<number[]>([0, 0, 0, 0]);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedStartYear, setSelectedStartYear] = useState<string>('');
  const [selectedEndYear, setSelectedEndYear] = useState<string>('');
  const [provinceHeatmap, setProvinceHeatmap] = useState<any[]>([]);

  const [districtGeoJSON, setDistrictGeoJSON] = useState<any>(null);
  const [lqProdData, setLqProdData] = useState<any[]>([]);
  const [loadingMap, setLoadingMap] = useState<boolean>(false);

  // Sync default province and district when user loads
  useEffect(() => {
    if (user?.profile?.asal_provinsi) {
      setSelectedProvince(user.profile.asal_provinsi);
    }
    if (user?.profile?.asal_kokab) {
      setSelectedDistrict(user.profile.asal_kokab);
    }
  }, [user]);

  // Fetch Full GeoJSON once
  useEffect(() => {
    fetch('/maps/geomaps_indo/indeksmaps/public/gadm41_IDN_2.json')
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setFullGeoJSON(data);
      })
      .catch(err => {
        console.warn('GeoJSON not loaded yet, using empty feature collection.');
      });
  }, []);

  // Fetch Provinces & Districts metadata
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const provRes = await fetch('/api/provinces');
        const provData = await provRes.json();
        setProvinces(provData);

        const distRes = await fetch('/api/districts');
        const distData = await distRes.json();
        setDistricts(distData);
      } catch (err) {
        console.error('Failed to fetch location metadata:', err);
      }
    };
    fetchLocations();
  }, []);

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
      if (!selectedDistrict) return;
      const yearParam = selectedEndYear || selectedStartYear || '2024';
      try {
        const res = await fetch(`/api/analysis/lq?year=${yearParam}`);
        const data = await res.json();
        const filtered = (data.lq_prod || []).filter((item: any) => 
          isMatchingDistrict(item.kabupaten, selectedDistrict)
        );
        setLqProdData(filtered);
      } catch (err) {
        console.error('Error fetching LQ data:', err);
      }
    };
    fetchLqData();
  }, [selectedDistrict, selectedStartYear, selectedEndYear]);

  // Compute filtered GeoJSON dynamically based on selectedProvince and selectedDistrict
  const geoJSONData = useMemo(() => {
    if (selectedDistrict && districtGeoJSON) {
      // District mode (zoom to Kecamatan)
      const styledFeatures = districtGeoJSON.features.map((f: any) => {
        const kecName = f.properties.NAME_3 || "";
        const kecUnggulans = lqProdData.filter(item => 
          isMatchingKecamatan(item.kecamatan, kecName) && item.is_unggulan
        );
        const hasUnggulan = kecUnggulans.length > 0;
        
        return {
          ...f,
          properties: {
            ...f.properties,
            NAME_2: f.properties.NAME_2,
            NAME_3: kecName,
            fill: hasUnggulan ? '#0066ff' : '#e2e8f0',
            stroke: '#ffffff',
            strokeWidth: 0.8,
            unggulan: kecUnggulans,
            isSelected: true,
            isDistrictView: true
          }
        };
      });
      return { ...districtGeoJSON, features: styledFeatures };
    } else if (fullGeoJSON) {
      // Province mode (zoom to Kabupaten)
      const targetProv = selectedProvince.replace(/\s+/g, '').toLowerCase();
      const provinceFeatures = fullGeoJSON.features.filter((f: any) => {
        return f.properties.NAME_1?.replace(/\s+/g, '').toLowerCase() === targetProv;
      });
      
      const maxUnggulan = Math.max(...provinceHeatmap.map((h: any) => h.unggulan_count || 0), 1);
      
      const styledFeatures = provinceFeatures.map((f: any) => {
        const distName = f.properties.KAB_KOTA || f.properties.WADMKK || f.properties.NAME_2;
        let fill = '#cbd5e1';
        let heatmapCount = 0;
        
        if (provinceHeatmap.length > 0) {
          const heatmapData = provinceHeatmap.find(h => isMatchingDistrict(distName, h.district));
          if (heatmapData) {
            heatmapCount = heatmapData.unggulan_count;
            if (heatmapCount === 0) fill = '#f1f5f9';
            else if (heatmapCount < maxUnggulan * 0.3) fill = '#99f6e4';
            else if (heatmapCount < maxUnggulan * 0.7) fill = '#2dd4bf';
            else fill = '#0d9488';
          }
        }
        
        return {
          ...f,
          properties: {
            ...f.properties,
            NAME_2: distName,
            fill: fill,
            stroke: '#ffffff',
            isSelected: true,
            unggulan_count: heatmapCount,
            isDistrictView: false
          }
        };
      });
      
      return { ...fullGeoJSON, features: styledFeatures };
    }
    
    return null;
  }, [fullGeoJSON, districtGeoJSON, selectedProvince, selectedDistrict, provinceHeatmap, lqProdData]);

  // Fetch Dashboard Stats from Backend
  useEffect(() => {
    if (!selectedProvince) return;
    
    const API_BASE = "";
    let url = `${API_BASE}/api/dashboard/summary/?province=${encodeURIComponent(selectedProvince)}`;
    if (selectedDistrict) {
      url += `&kabupaten=${encodeURIComponent(selectedDistrict)}`;
    }
    if (selectedStartYear) {
      url += `&start_year=${selectedStartYear}`;
    }
    if (selectedEndYear) {
      url += `&end_year=${selectedEndYear}`;
    }
    
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('API failed');
        return res.json();
      })
      .then(data => {
        setStatsData(data.stats);
        setLqSummary(data.lq_summary || []);
        setKlassenData(data.klassen || [0, 0, 0, 0]);
        setApiMessage(data.message || null);
        setProvinceHeatmap(data.province_heatmap || []);
        if (data.available_years) setAvailableYears(data.available_years);
      })
      .catch(err => {
        console.error('Failed to fetch dashboard stats:', err);
      });
  }, [selectedProvince, selectedDistrict, selectedStartYear, selectedEndYear]);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="eyebrow mb-2 text-teal-600">Beranda • REGINA</span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">
            Regional Intelligence Analytics
          </h1>
          <p className="text-slate-500 max-w-2xl">
            Tinjauan komprehensif indikator pertumbuhan ekonomi dan potensi investasi daerah berdasarkan analisis LQ, SSA, dan Klassen.
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
              {selectedProvince.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Provinsi</div>
              
              {user?.is_superuser ? (
                <SearchableSelect 
                  className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer hover:text-teal-600 transition-colors"
                  value={selectedProvince}
                  onChange={(val) => {
                    setSelectedProvince(String(val));
                    setSelectedDistrict(''); // reset district
                  }}
                  options={provinces.map((prov) => ({ label: prov.name, value: prov.name }))}
                />
              ) : (
                <div className="text-sm font-bold text-slate-700 capitalize">{selectedProvince}</div>
              )}
            </div>
          </div>
          
          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold">
              <MapPin size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Kabupaten/Kota</div>
              
              {user?.is_superuser ? (
                <SearchableSelect 
                  className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer hover:text-sky-600 transition-colors"
                  value={selectedDistrict}
                  onChange={(val) => setSelectedDistrict(String(val))}
                  options={[
                    { label: "-- Semua --", value: "" },
                    ...districts
                      .filter(d => d.province_name === selectedProvince)
                      .map((dist) => ({ label: dist.name, value: dist.name }))
                  ]}
                  placeholder="-- Semua --"
                />
              ) : (
                <div className="text-sm font-bold text-slate-700 capitalize">{selectedDistrict || 'Belum dipilih'}</div>
              )}
            </div>
          </div>
          
          {availableYears.length > 0 && (
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase mb-1">Tahun Awal</div>
                <SearchableSelect
                  className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer hover:text-teal-600 transition-colors"
                  value={selectedStartYear}
                  onChange={(val) => setSelectedStartYear(String(val))}
                  options={[
                    { label: "Semua", value: "" },
                    ...availableYears.map(y => ({ label: String(y), value: y }))
                  ]}
                  placeholder="Semua"
                />
              </div>
              <div className="w-px h-8 bg-slate-200 mx-1"></div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase mb-1">Tahun Akhir</div>
                <SearchableSelect
                  className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer hover:text-teal-600 transition-colors"
                  value={selectedEndYear}
                  onChange={(val) => setSelectedEndYear(String(val))}
                  options={[
                    { label: "Semua", value: "" },
                    ...availableYears.map(y => ({ label: String(y), value: y }))
                  ]}
                  placeholder="Semua"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Agregat Sektor (Bento Grid) */}
      <section className="bento-grid">
        {[
          { label: 'Sektor Unggulan', value: statsData?.sektor || '-', icon: <Building2 size={20} />, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Subsektor Prioritas', value: statsData?.subsektor || '-', icon: <Layers size={20} />, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Komoditas Unggulan', value: statsData?.komoditas || '-', icon: <TrendingUp size={20} />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Kec. Terdata', value: statsData?.kecamatan || '-', icon: <MapPin size={20} />, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((item, idx) => (
          <div key={idx} className="bento-card relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${item.bg} opacity-50 group-hover:scale-150 transition-transform duration-500`}></div>
            <div className="flex justify-between items-center mb-4 relative z-10">
              <span className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                {item.icon}
              </span>
            </div>
            <div className="relative z-10">
              <div className="text-4xl font-bold text-slate-800 mb-1">{item.value}</div>
              <div className="text-sm font-medium text-slate-500">{item.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Peta Potensi Section */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Peta Sebaran Komoditas Unggulan</h2>
            <p className="text-sm text-slate-500">Visualisasi geospasial konsentrasi produksi komoditas (Heatmap).</p>
          </div>
          <Link href="/dashboard/komoditas" className="text-teal-600 hover:text-teal-700 text-sm font-semibold flex items-center gap-1">
            Lihat Detail <ArrowRight size={16} />
          </Link>
        </div>
        
        <div className="w-full relative border-b border-slate-100 bg-slate-50 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:2rem_2rem]" style={{ height: '400px' }}>
          {loadingMap ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <span className="text-sm">Memuat data spasial...</span>
            </div>
          ) : geoJSONData && geoJSONData.features.length > 0 ? (
            <IndeksMap
              data={geoJSONData}
              width={800}
              height={400}
              padding={30}
              enableZoomPan={true}
              defaultFill="#0d9488"
              hoverFill="#3b82f6"
              strokeColor="#ffffff"
              strokeWidth={0.5}
              renderTooltip={(feature) => {
                if (feature.properties.isDistrictView) {
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
                              <span className="text-slate-300 font-medium">{u.komoditas}</span>
                              <span className="font-bold text-amber-400">LQ: {u.lq.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3 rounded-lg shadow-xl border border-slate-700 min-w-[160px]">
                      <strong className="block text-teal-300 mb-1 border-b border-slate-600 pb-1 text-sm">{feature.properties.NAME_2}</strong>
                      <div className="text-xs text-slate-300 mt-2 flex flex-col gap-1">
                        {feature.properties.unggulan_count !== undefined ? (
                          <span><span className="font-bold text-white text-sm">{feature.properties.unggulan_count}</span> Sektor Unggulan</span>
                        ) : null}
                        <span className="text-[10px] text-slate-400 mt-1">Klik untuk melihat detail</span>
                      </div>
                    </div>
                  );
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <MapPin size={48} className="mb-4 opacity-50" />
              <p>Memuat Data Peta Geospasial...</p>
              <p className="text-xs mt-2">Menunggu respons GeoJSON atau wilayah tidak ditemukan</p>
            </div>
          )}
        </div>
        
        {/* Ringkasan Analisis Sektor */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-teal-600" /> Hasil Analisis PDRB {selectedDistrict ? `(${selectedDistrict})` : ''}
            </h3>
            {apiMessage && (
               <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md mb-4 flex items-start gap-2 text-sm">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p>{apiMessage}</p>
               </div>
            )}
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {lqSummary.length > 0 ? (
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10 rounded-t-md">
                    <tr>
                      <th className="py-2 px-3">Sektor</th>
                      <th className="py-2 px-3 text-right">LQ</th>
                      <th className="py-2 px-3 text-right">SSA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...lqSummary].sort((a, b) => a.sektor.localeCompare(b.sektor)).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-700 w-2/3 truncate" title={row.sektor}>{row.sektor}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-600">{row.lq}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">{row.ssa !== null ? row.ssa : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-sm text-slate-400 italic p-4 text-center">Data analisis tidak tersedia untuk wilayah ini. {selectedDistrict ? 'Pastikan data PDRB Kabupaten dan Provinsi telah diinput.' : 'Silakan klik salah satu kabupaten di peta.'}</div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PieChart size={18} className="text-sky-600" /> Diagram Tipologi Klassen
            </h3>
            <div className="grid grid-cols-2 gap-2 h-40">
              <div className="bg-teal-50 border border-teal-100 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <div className="text-xs text-teal-800 font-semibold mb-1">Maju & Tumbuh Cepat</div>
                <div className="text-2xl font-bold text-teal-600">{klassenData[0]}</div>
                <div className="text-[10px] text-teal-600/70">Sektor</div>
              </div>
              <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <div className="text-xs text-sky-800 font-semibold mb-1">Maju tapi Tertekan</div>
                <div className="text-2xl font-bold text-sky-600">{klassenData[1]}</div>
                <div className="text-[10px] text-sky-600/70">Sektor</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <div className="text-xs text-amber-800 font-semibold mb-1">Potensial (Tumbuh)</div>
                <div className="text-2xl font-bold text-amber-600">{klassenData[2]}</div>
                <div className="text-[10px] text-amber-600/70">Sektor</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <div className="text-xs text-slate-700 font-semibold mb-1">Relatif Tertinggal</div>
                <div className="text-2xl font-bold text-slate-500">{klassenData[3]}</div>
                <div className="text-[10px] text-slate-400">Sektor</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
