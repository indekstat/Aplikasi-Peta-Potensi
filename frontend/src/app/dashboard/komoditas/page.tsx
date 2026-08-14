'use client';
import { useState, useEffect, useMemo } from 'react';
import { IndeksMap } from 'indeksmaps';
import { Layers, MapPin, TrendingUp, ChevronUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function KomoditasUnggulan() {
  const { user } = useAuth();
  const [fullGeoJSON, setFullGeoJSON] = useState<any>(null);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('Jawa Timur');

  const [statsData, setStatsData] = useState<any>(null);
  const [topKomoditas, setTopKomoditas] = useState<any[]>([]);

  // Sync default province when user loads
  useEffect(() => {
    if (user?.profile?.asal_provinsi) {
      setSelectedProvince(user.profile.asal_provinsi);
    }
  }, [user]);

  // Fetch GeoJSON once
  useEffect(() => {
    fetch('/maps/geomaps_indo/indeksmaps/public/gadm41_IDN_2.json')
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setFullGeoJSON(data);
        // Extract unique provinces
        const uniqueProvinces = Array.from(
          new Set(data.features.map((f: any) => {
            let name = f.properties.NAME_1 || "";
            name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
            name = name.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
            return name;
          }))
        ) as string[];
        setProvinces(uniqueProvinces.sort());
      })
      .catch(err => {
        console.warn('GeoJSON not loaded yet');
      });
  }, []);

  // Compute filtered GeoJSON for Heatmap
  const geoJSONData = useMemo(() => {
    if (!fullGeoJSON) return null;

    // Helper to get bounds of a feature
    const getBounds = (feature: any) => {
      let minX = 180, maxX = -180, minY = 90, maxY = -90;
      const processCoords = (coords: any[]) => {
        if (typeof coords[0] === 'number') {
          if (coords[0] < minX) minX = coords[0];
          if (coords[0] > maxX) maxX = coords[0];
          if (coords[1] < minY) minY = coords[1];
          if (coords[1] > maxY) maxY = coords[1];
        } else {
          coords.forEach(processCoords);
        }
      };
      if (feature.geometry && feature.geometry.coordinates) {
        processCoords(feature.geometry.coordinates);
      }
      return { minX, maxX, minY, maxY };
    };

    // 1. Calculate bounds of the selected province
    let selMinX = 180, selMaxX = -180, selMinY = 90, selMaxY = -90;
    const targetProv = selectedProvince.replace(/\s+/g, '').toLowerCase();
    
    fullGeoJSON.features.forEach((f: any) => {
      if (f.properties.NAME_1?.replace(/\s+/g, '').toLowerCase() === targetProv) {
        const b = getBounds(f);
        if (b.minX < selMinX) selMinX = b.minX;
        if (b.maxX > selMaxX) selMaxX = b.maxX;
        if (b.minY < selMinY) selMinY = b.minY;
        if (b.maxY > selMaxY) selMaxY = b.maxY;
      }
    });

    // Add 5% margin for context (tight bounds to prevent zooming out)
    const paddingX = (selMaxX - selMinX) * 0.05;
    const paddingY = (selMaxY - selMinY) * 0.05;
    selMinX -= paddingX;
    selMaxX += paddingX;
    selMinY -= paddingY;
    selMaxY += paddingY;

    // 2. Filter features that intersect this expanded bounding box
    const contextFeatures = fullGeoJSON.features.filter((f: any) => {
      const b = getBounds(f);
      return !(b.minX > selMaxX || b.maxX < selMinX || b.minY > selMaxY || b.maxY < selMinY);
    });

    // 3. Process styling
    const styledFeatures = contextFeatures.map((f: any) => {
      const isSelected = f.properties.NAME_1?.replace(/\s+/g, '').toLowerCase() === targetProv;
      
      const intensity = Math.random();
      let fillColor = '#ffffff';
      
      if (isSelected) {
        if (intensity > 0.8) fillColor = '#0f766e';
        else if (intensity > 0.5) fillColor = '#0d9488';
        else if (intensity > 0.2) fillColor = '#99f6e4';
        else fillColor = '#ccfbf1';
      }
      
      return {
        ...f,
        properties: {
          ...f.properties,
          NAME_2: f.properties.KAB_KOTA || f.properties.NAME_2 || f.properties.WADMKK,
          fill: fillColor,
          stroke: isSelected ? '#ffffff' : '#f1f5f9',
          produksi: isSelected ? Math.floor(intensity * 10000) : 0,
          isSelected
        }
      };
    });

    return { ...fullGeoJSON, features: styledFeatures };
  }, [fullGeoJSON, selectedProvince]);

  // Fetch Dashboard Stats from Backend
  useEffect(() => {
    if (!selectedProvince) return;
    
    const API_BASE = "";
    fetch(`${API_BASE}/api/dashboard/summary/?province=${encodeURIComponent(selectedProvince)}`)
      .then(res => {
        if (!res.ok) throw new Error('API failed');
        return res.json();
      })
      .then(data => {
        setStatsData(data.stats);
        setTopKomoditas(data.top_komoditas || []);
      })
      .catch(err => {
        console.error('Failed to fetch komoditas stats:', err);
      });
  }, [selectedProvince]);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full pb-10">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col gap-2">
          <span className="eyebrow text-teal-600">Pemetaan Spesifik • Page 3</span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
            Komoditas Unggulan Daerah
          </h1>
          <p className="text-slate-500 max-w-2xl">
            Identifikasi komoditas dominan per wilayah dengan analisis volumetrik dan spasial.
          </p>
        </div>
        
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
            {selectedProvince.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Provinsi</div>
            
            {user?.is_superuser ? (
              <select 
                className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer hover:text-teal-600 transition-colors"
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
              >
                {provinces.map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            ) : (
              <div className="text-sm font-bold text-slate-700 capitalize">{selectedProvince}</div>
            )}
          </div>
        </div>
      </section>

      {/* Summary Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Komoditas Terdata', value: statsData?.komoditas || '-', icon: <Layers size={24} className="text-teal-600"/> },
          { label: 'Kecamatan Terdata', value: statsData?.kecamatan || '-', icon: <MapPin size={24} className="text-sky-600"/> },
          { label: 'Status Data API', value: statsData ? 'Terkoneksi' : 'Memuat...', icon: <TrendingUp size={24} className="text-amber-600"/> },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
              {item.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-500 mb-1">{item.label}</div>
              <div className="text-2xl font-bold text-slate-800">{item.value}</div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Map Section */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center rounded-t-2xl">
              <h2 className="font-bold text-slate-800">Peta Sebaran Komoditas (Heatmap)</h2>
              <select className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-teal-500">
                <option>Semua Komoditas</option>
                <option>Padi Sawah</option>
                <option>Tebu</option>
                <option>Jagung</option>
              </select>
            </div>
            <div className="w-full relative h-96 border-b border-slate-100 bg-slate-50 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:2rem_2rem]">
              {geoJSONData && geoJSONData.features.length > 0 ? (
                <IndeksMap
                  data={geoJSONData}
                  width={800}
                  height={400}
                  padding={30}
                  enableZoomPan={false}
                  defaultFill="#f8fafc"
                  hoverFill="#14b8a6"
                  strokeColor="#ffffff"
                  strokeWidth={0.5}
                  renderTooltip={(feature) => {
                    if (!feature.properties.isSelected) return null;
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3 rounded-lg shadow-xl border border-slate-700 min-w-[160px]">
                        <strong className="block text-amber-300 mb-1 border-b border-slate-600 pb-1 text-sm">{feature.properties.NAME_2}</strong>
                        <div className="text-xs text-slate-300 mt-2 flex justify-between">
                          <span>Status:</span>
                          <span className="font-bold text-amber-400">Sentra Utama</span>
                        </div>
                        <div className="text-xs text-slate-300 mt-1 flex justify-between">
                          <span>Produksi:</span>
                          <span className="font-bold text-white">{feature.properties.produksi.toLocaleString()} Ton</span>
                        </div>
                      </div>
                    );
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <MapPin size={48} className="mb-4 opacity-50" />
                  <p>Memuat Peta Sebaran Komoditas...</p>
                  <p className="text-xs mt-2">Menunggu respons GeoJSON atau wilayah tidak ditemukan</p>
                </div>
              )}
            </div>
            <div className="p-4 bg-white border-t border-slate-100 text-xs flex items-center justify-end gap-3">
              <span className="text-slate-500">Intensitas Produksi:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#99f6e4] rounded-sm"></div> Rendah
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#0d9488] rounded-sm"></div> Sedang
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#0f766e] rounded-sm"></div> Tinggi
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-8">
          {/* Top Ranking */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full">
            <div className="p-5 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
              <h2 className="font-bold text-slate-800">Top Ranking Komoditas</h2>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {topKomoditas.map((item) => (
                <div key={item.rank} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm">
                      #{item.rank}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.volume} {item.unit}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-bold flex items-center justify-end gap-1 ${item.change.includes('+') ? 'text-teal-600' : 'text-rose-500'}`}>
                      {item.change.includes('+') ? <ChevronUp size={12} /> : null}
                      {item.change}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">LQ: {item.lq}</div>
                  </div>
                </div>
              ))}

              <button className="w-full py-2 mt-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 font-medium hover:border-teal-400 hover:text-teal-700 transition-colors">
                Lihat Seluruh Komoditas
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
