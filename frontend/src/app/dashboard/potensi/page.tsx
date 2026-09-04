'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export default function PotensiUnggulan() {
  const { user } = useAuth();
  
  const [selectedProvince, setSelectedProvince] = useState<string>('Jawa Timur');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  
  const [lqSummary, setLqSummary] = useState<any[]>([]);
  const [klassenData, setKlassenData] = useState<number[]>([0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [selectedKuadran, setSelectedKuadran] = useState<number | null>(null);
  const [selectedLqFilter, setSelectedLqFilter] = useState<'basis' | 'non-basis' | null>(null);
  const [selectedSsaFilter, setSelectedSsaFilter] = useState<'positive' | 'negative' | null>(null);

  const [districts, setDistricts] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedStartYear, setSelectedStartYear] = useState<string>('');
  const [selectedEndYear, setSelectedEndYear] = useState<string>('');

  const API_BASE = "";

  useEffect(() => {
    const fetchLocations = async () => {
      if (!user) return;
      if (!user.is_superuser && !user?.profile?.asal_provinsi) return;
      
      try {
        const provRes = await fetch(`${API_BASE}/api/provinces`);
        const provData = await provRes.json();
        const distRes = await fetch(`${API_BASE}/api/districts`);
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

  useEffect(() => {
    if (!selectedProvince) return;
    
    setLoading(true);
    let url = `${API_BASE}/api/dashboard/summary?province=${encodeURIComponent(selectedProvince)}`;
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
      .then(res => res.json())
      .then(data => {
        setLqSummary(data.lq_summary || []);
        setKlassenData(data.klassen || [0, 0, 0, 0]);
        setApiMessage(data.message || null);
        if (data.available_years) {
          setAvailableYears(data.available_years);
        }
      })
      .catch(err => {
        console.error('Failed to fetch potensi stats:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedProvince, selectedDistrict, selectedStartYear, selectedEndYear]);

  const basisCount = lqSummary.filter(x => x.lq >= 1).length;
  
  const getQuadrantInfo = (kuadran: number | null, lq: number) => {
    if (kuadran === null || kuadran === 0) {
      const isBasis = lq >= 1;
      return {
        status: isBasis ? 'Basis' : 'Non-Basis',
        klassen: '-',
        badgeClass: isBasis 
          ? 'bg-teal-50 text-teal-700 border border-teal-200' 
          : 'bg-slate-100 text-slate-600 border border-slate-200'
      };
    }

    switch (kuadran) {
      case 1:
        return {
          status: 'Unggulan',
          klassen: 'I (Maju & Tumbuh)',
          badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        };
      case 2:
        return {
          status: 'Potensial',
          klassen: 'II (Masih Dapat Berkembang)',
          badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200'
        };
      case 3:
        return {
          status: 'Perlu Didorong',
          klassen: 'III (Maju tapi Tertekan)',
          badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200'
        };
      case 4:
        return {
          status: 'Tertinggal',
          klassen: 'IV (Relatif Tertinggal)',
          badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200'
        };
      default:
        return {
          status: '-',
          klassen: '-',
          badgeClass: 'bg-slate-50 text-slate-500 border border-slate-100'
        };
    }
  };

  const totalSektor = lqSummary.length;
  const nonBasisCount = totalSektor - basisCount;

  const ssaCountable = lqSummary.filter(x => x.ssa !== null);
  const ssaPosCount = ssaCountable.filter(x => x.ssa > 0).length;
  const ssaNegCount = ssaCountable.filter(x => x.ssa <= 0).length;

  const lqPieData = [
    { name: 'Sektor Basis (LQ ≥ 1)', value: basisCount, color: '#0d9488' },
    { name: 'Sektor Non-Basis (LQ < 1)', value: nonBasisCount, color: '#94a3b8' }
  ];

  const ssaPieData = [
    { name: 'SSA Positif (D+S > 0)', value: ssaPosCount, color: '#10b981' },
    { name: 'SSA Negatif (D+S ≤ 0)', value: ssaNegCount, color: '#f43f5e' }
  ];

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full pb-10">
      <section className="flex flex-col gap-2">
        <span className="eyebrow text-teal-600">Analisis Ekonomi • Page 2</span>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
          Potensi Unggulan Daerah
        </h1>
        <p className="text-slate-500">
          Analisis mendalam mengenai Sektor Unggulan berdasarkan pendekatan LQ, SSA, dan kuadran Tipologi Klassen 
          {selectedDistrict ? ` untuk ${selectedDistrict}` : ' (Silakan pilih Kabupaten/Kota di bawah ini)'}.
        </p>
        <div className="flex flex-col md:flex-row gap-4 mt-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-fit">
          {user?.is_superuser ? (
            <>
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Provinsi</label>
                <SearchableSelect
                  className="w-full text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer border-b border-slate-200 pb-1 focus:border-teal-500 transition-colors"
                  value={selectedProvince}
                  onChange={(val) => {
                    setSelectedProvince(val);
                    setSelectedDistrict('');
                  }}
                  options={provinces.map(p => ({ label: p.name, value: p.name }))}
                  placeholder="-- Pilih Provinsi --"
                />
              </div>
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kabupaten / Kota</label>
                <SearchableSelect
                  className="w-full text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer border-b border-slate-200 pb-1 focus:border-teal-500 transition-colors"
                  value={selectedDistrict}
                  onChange={(val) => setSelectedDistrict(val)}
                  disabled={!selectedProvince}
                  options={districts
                    .filter(d => d.province_name === selectedProvince)
                    .map(d => ({ label: d.name, value: d.name }))}
                  placeholder="-- Pilih Kokab --"
                />
              </div>
              
              {availableYears.length > 0 && (
                <>
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tahun Awal</label>
                    <SearchableSelect
                      className="w-full text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer border-b border-slate-200 pb-1 focus:border-teal-500 transition-colors"
                      value={selectedStartYear}
                      onChange={(val) => setSelectedStartYear(val)}
                      options={[
                        { label: "Semua Tahun", value: "" },
                        ...availableYears.map(y => ({ label: String(y), value: y }))
                      ]}
                      placeholder="Semua Tahun"
                    />
                  </div>
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tahun Akhir</label>
                    <SearchableSelect
                      className="w-full text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer border-b border-slate-200 pb-1 focus:border-teal-500 transition-colors"
                      value={selectedEndYear}
                      onChange={(val) => setSelectedEndYear(val)}
                      options={[
                        { label: "Semua Tahun", value: "" },
                        ...availableYears.map(y => ({ label: String(y), value: y }))
                      ]}
                      placeholder="Semua Tahun"
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Wilayah Anda</span>
                <div className="text-sm font-bold text-slate-700">
                  {selectedProvince} {selectedDistrict ? ` > ${selectedDistrict}` : ''}
                </div>
              </div>
              {availableYears.length > 0 && (
                <>
                  <div className="flex flex-col gap-1 ml-4 border-l pl-4 border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tahun Awal</span>
                    <SearchableSelect
                      className="w-full text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer border-b border-slate-200 pb-1 focus:border-teal-500 transition-colors"
                      value={selectedStartYear}
                      onChange={(val) => setSelectedStartYear(val)}
                      options={[
                        { label: "Semua Tahun", value: "" },
                        ...availableYears.map(y => ({ label: String(y), value: y }))
                      ]}
                      placeholder="Semua Tahun"
                    />
                  </div>
                  <div className="flex flex-col gap-1 ml-4 border-l pl-4 border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tahun Akhir</span>
                    <SearchableSelect
                      className="w-full text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer border-b border-slate-200 pb-1 focus:border-teal-500 transition-colors"
                      value={selectedEndYear}
                      onChange={(val) => setSelectedEndYear(val)}
                      options={[
                        { label: "Semua Tahun", value: "" },
                        ...availableYears.map(y => ({ label: String(y), value: y }))
                      ]}
                      placeholder="Semua Tahun"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* Summary Sektor - Pie Charts */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pie Chart LQ */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
          <h3 className="text-xs font-bold self-start mb-4 uppercase tracking-wider text-slate-400">
            Distribusi Sektor berdasarkan LQ (Unggulan vs Non-Unggulan)
          </h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Memuat grafik...</div>
          ) : totalSektor === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">Data tidak tersedia</div>
          ) : (
            <div className="w-full flex flex-col sm:flex-row items-center justify-around gap-4">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={lqPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {lqPieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          onClick={() => setSelectedLqFilter(index === 0 ? 'basis' : 'non-basis')}
                          className="cursor-pointer outline-none"
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Sektor`, 'Jumlah']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2.5">
                {lqPieData.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedLqFilter(idx === 0 ? 'basis' : 'non-basis')}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg border border-transparent hover:border-slate-100 transition-all"
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-xs font-semibold text-slate-600">{item.name}</span>
                    <span className="text-xs font-bold text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      {item.value} Sektor ({totalSektor > 0 ? ((item.value / totalSektor) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pie Chart SSA */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
          <h3 className="text-xs font-bold self-start mb-4 uppercase tracking-wider text-slate-400">
            Distribusi Sektor berdasarkan SSA (D+S Positif vs Negatif)
          </h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Memuat grafik...</div>
          ) : ssaCountable.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic text-center px-4">
              Data SSA tidak tersedia (Pilih filter rentang tahun ≥ 2 tahun)
            </div>
          ) : (
            <div className="w-full flex flex-col sm:flex-row items-center justify-around gap-4">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ssaPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {ssaPieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          onClick={() => setSelectedSsaFilter(index === 0 ? 'positive' : 'negative')}
                          className="cursor-pointer outline-none"
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Sektor`, 'Jumlah']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2.5">
                {ssaPieData.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedSsaFilter(idx === 0 ? 'positive' : 'negative')}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg border border-transparent hover:border-slate-100 transition-all"
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-xs font-semibold text-slate-600">{item.name}</span>
                    <span className="text-xs font-bold text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      {item.value} Sektor ({ssaCountable.length > 0 ? ((item.value / ssaCountable.length) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {apiMessage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md flex items-start gap-2 text-sm">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p>{apiMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Tabel Nilai Analisis */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800">Tabel Nilai LQ, SSA, dan Klassen</h2>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-4 text-center w-12">No</th>
                    <th className="px-6 py-4">Sektor</th>
                    <th className="px-6 py-4 text-center">LQ</th>
                    <th className="px-6 py-4 text-center">SSA (D+S)</th>
                    <th className="px-6 py-4 text-center">Klassen</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-500">Memuat data analisis...</td>
                    </tr>
                  ) : lqSummary.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-500 italic">Data tidak tersedia. Silakan pilih Kabupaten yang memiliki data PDRB.</td>
                    </tr>
                  ) : (
                    [...lqSummary].sort((a, b) => a.sektor.localeCompare(b.sektor)).map((row, idx) => {
                      const quadInfo = getQuadrantInfo(row.kuadran, row.lq);
                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-4 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-4 font-semibold text-slate-700">
                            {row.sektor}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-mono px-2 py-1 rounded font-semibold ${row.lq >= 1 ? 'bg-teal-50 text-teal-800 border border-teal-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                              {row.lq}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-mono ${row.ssa === null ? 'text-slate-400' : (row.ssa > 0 ? 'text-teal-600' : 'text-rose-500')}`}>
                              {row.ssa === null ? '-' : (row.ssa > 0 ? '+' : '') + row.ssa}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-slate-600 font-medium">
                            {quadInfo.klassen}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${quadInfo.badgeClass}`}>
                              {quadInfo.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-8">
          {/* Diagram Klassen */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle size={18} className="text-teal-600" />
                Kuadran Tipologi Klassen
              </h2>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
              <div className="relative aspect-square border-2 border-slate-200 rounded-lg p-2 bg-slate-50 mb-4">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-300"></div>
                <div className="absolute left-1/2 top-0 h-full w-0.5 bg-slate-300"></div>
                
                <div className="grid grid-cols-2 grid-rows-2 h-full gap-2 relative z-10 text-xs">
                  {/* Kuadran I */}
                  <div 
                    onClick={() => setSelectedKuadran(1)}
                    className="bg-teal-100/50 rounded flex flex-col items-center justify-center p-2 text-center text-teal-800 font-semibold border border-teal-200/50 relative cursor-pointer hover:bg-teal-100 transition-colors"
                  >
                    <span className="text-lg">I</span>
                    Maju & Tumbuh
                    <div className="absolute top-1 right-2 text-[10px] bg-teal-200 px-1.5 rounded">{klassenData[0]}</div>
                  </div>
                  {/* Kuadran II */}
                  <div 
                    onClick={() => setSelectedKuadran(2)}
                    className="bg-sky-100/50 rounded flex flex-col items-center justify-center p-2 text-center text-sky-800 font-semibold border border-sky-200/50 relative cursor-pointer hover:bg-sky-100 transition-colors"
                  >
                    <span className="text-lg">II</span>
                    Masih Dapat Berkembang
                    <div className="absolute top-1 right-2 text-[10px] bg-sky-200 px-1.5 rounded">{klassenData[1]}</div>
                  </div>
                  {/* Kuadran III */}
                  <div 
                    onClick={() => setSelectedKuadran(3)}
                    className="bg-amber-100/50 rounded flex flex-col items-center justify-center p-2 text-center text-amber-800 font-semibold border border-amber-200/50 relative cursor-pointer hover:bg-amber-100 transition-colors"
                  >
                    <span className="text-lg">III</span>
                    Maju tapi Tertekan
                    <div className="absolute top-1 right-2 text-[10px] bg-amber-200 px-1.5 rounded">{klassenData[2]}</div>
                  </div>
                  {/* Kuadran IV */}
                  <div 
                    onClick={() => setSelectedKuadran(4)}
                    className="bg-slate-200/50 rounded flex flex-col items-center justify-center p-2 text-center text-slate-600 font-semibold border border-slate-300/50 relative cursor-pointer hover:bg-slate-200 transition-colors"
                  >
                    <span className="text-lg">IV</span>
                    Tertinggal
                    <div className="absolute top-1 right-2 text-[10px] bg-slate-300 px-1.5 rounded">{klassenData[3]}</div>
                  </div>
                </div>

                {/* Y Axis Label */}
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                  Pertumbuhan Ekonomi (r)
                </div>
                {/* X Axis Label */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                  Kontribusi PDRB (y)
                </div>
              </div>

              <div className="mt-8 text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p>Kuadran I (Maju & Tumbuh) merupakan sektor paling ideal dengan tingkat pertumbuhan dan kontribusi yang tinggi melampaui rata-rata provinsi.</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Modal Popup untuk Daftar Sektor Kuadran */}
      {selectedKuadran !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`p-4 border-b flex justify-between items-center ${
              selectedKuadran === 1 ? 'bg-teal-50 border-teal-100 text-teal-800' :
              selectedKuadran === 2 ? 'bg-sky-50 border-sky-100 text-sky-800' :
              selectedKuadran === 3 ? 'bg-amber-50 border-amber-100 text-amber-800' :
              'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <h3 className="font-bold">
                Kuadran {selectedKuadran}: {
                  selectedKuadran === 1 ? 'Maju & Tumbuh' :
                  selectedKuadran === 2 ? 'Masih Dapat Berkembang' :
                  selectedKuadran === 3 ? 'Maju tapi Tertekan' : 'Tertinggal'
                }
              </h3>
              <button 
                onClick={() => setSelectedKuadran(null)}
                className="p-1 rounded-full hover:bg-black/5 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {lqSummary.filter(s => s.kuadran === selectedKuadran).length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic text-sm">
                  Tidak ada sektor di kuadran ini.
                </div>
              ) : (
                <ul className="space-y-2">
                  {[...lqSummary].filter(s => s.kuadran === selectedKuadran).sort((a, b) => a.sektor.localeCompare(b.sektor)).map((s, idx) => (
                    <li key={idx} className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3 flex gap-3 items-center">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        selectedKuadran === 1 ? 'bg-teal-500' :
                        selectedKuadran === 2 ? 'bg-sky-500' :
                        selectedKuadran === 3 ? 'bg-amber-500' :
                        'bg-slate-400'
                      }`} />
                      <span className="leading-snug">{s.sektor}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup untuk Daftar Sektor LQ */}
      {selectedLqFilter !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`p-4 border-b flex justify-between items-center ${
              selectedLqFilter === 'basis' ? 'bg-teal-50 border-teal-100 text-teal-800' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <h3 className="font-bold">
                {selectedLqFilter === 'basis' ? 'Sektor Basis (LQ ≥ 1)' : 'Sektor Non-Basis (LQ < 1)'}
              </h3>
              <button 
                onClick={() => setSelectedLqFilter(null)}
                className="p-1 rounded-full hover:bg-black/5 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {lqSummary.filter(s => selectedLqFilter === 'basis' ? s.lq >= 1 : s.lq < 1).length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic text-sm">
                  Tidak ada sektor dalam kategori ini.
                </div>
              ) : (
                <ul className="space-y-2">
                  {[...lqSummary].filter(s => selectedLqFilter === 'basis' ? s.lq >= 1 : s.lq < 1).sort((a, b) => a.sektor.localeCompare(b.sektor)).map((s, idx) => (
                    <li key={idx} className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3 flex gap-3 items-center">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        selectedLqFilter === 'basis' ? 'bg-teal-600' : 'bg-slate-400'
                      }`} />
                      <span className="leading-snug">{s.sektor}</span>
                      <span className="ml-auto font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border">
                        LQ: {s.lq}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup untuk Daftar Sektor SSA */}
      {selectedSsaFilter !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`p-4 border-b flex justify-between items-center ${
              selectedSsaFilter === 'positive' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}>
              <h3 className="font-bold">
                {selectedSsaFilter === 'positive' ? 'Sektor SSA Positif (D+S > 0)' : 'Sektor SSA Negatif (D+S ≤ 0)'}
              </h3>
              <button 
                onClick={() => setSelectedSsaFilter(null)}
                className="p-1 rounded-full hover:bg-black/5 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {lqSummary.filter(s => s.ssa !== null && (selectedSsaFilter === 'positive' ? s.ssa > 0 : s.ssa <= 0)).length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic text-sm">
                  Tidak ada sektor dalam kategori ini.
                </div>
              ) : (
                <ul className="space-y-2">
                  {[...lqSummary].filter(s => s.ssa !== null && (selectedSsaFilter === 'positive' ? s.ssa > 0 : s.ssa <= 0)).sort((a, b) => a.sektor.localeCompare(b.sektor)).map((s, idx) => (
                    <li key={idx} className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3 flex gap-3 items-center">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        selectedSsaFilter === 'positive' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`} />
                      <span className="leading-snug">{s.sektor}</span>
                      <span className="ml-auto font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border">
                        SSA: {s.ssa > 0 ? `+${s.ssa}` : s.ssa}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
