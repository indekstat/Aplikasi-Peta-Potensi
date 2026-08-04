'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ArrowUpRight, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function PotensiUnggulan() {
  const { user } = useAuth();
  
  const [selectedProvince, setSelectedProvince] = useState<string>('Jawa Timur');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  
  const [lqSummary, setLqSummary] = useState<any[]>([]);
  const [klassenData, setKlassenData] = useState<number[]>([0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.profile?.asal_provinsi) {
      setSelectedProvince(user.profile.asal_provinsi);
    }
    if (user?.profile?.asal_kokab) {
      setSelectedDistrict(user.profile.asal_kokab);
    }
  }, [user]);

  useEffect(() => {
    if (!selectedProvince) return;
    
    setLoading(true);
    let url = `http://localhost:8000/api/dashboard/summary/?province=${encodeURIComponent(selectedProvince)}`;
    if (selectedDistrict) {
      url += `&kabupaten=${encodeURIComponent(selectedDistrict)}`;
    }
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setLqSummary(data.lq_summary || []);
        setKlassenData(data.klassen || [0, 0, 0, 0]);
        setApiMessage(data.message || null);
      })
      .catch(err => {
        console.error('Failed to fetch potensi stats:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedProvince, selectedDistrict]);

  const basisCount = lqSummary.filter(x => x.lq >= 1).length;
  
  const getKlassenLabel = (kuadran: number | null) => {
    if (kuadran === 1) return 'Maju & Tumbuh Cepat';
    if (kuadran === 2) return 'Maju tapi Tertekan';
    if (kuadran === 3) return 'Potensial (Berkembang)';
    if (kuadran === 4) return 'Relatif Tertinggal';
    return '-';
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full pb-10">
      <section className="flex flex-col gap-2">
        <span className="eyebrow text-teal-600">Analisis Ekonomi • Page 2</span>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
          Potensi Unggulan Daerah
        </h1>
        <p className="text-slate-500">
          Analisis mendalam mengenai Sektor Unggulan berdasarkan pendekatan LQ, SSA, dan kuadran Tipologi Klassen 
          {selectedDistrict ? ` untuk ${selectedDistrict}` : ' (Silakan pilih Kabupaten di menu Dashboard)'}.
        </p>
      </section>

      {/* Summary Sektor */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Sektor Unggulan (Basis)', value: loading ? '-' : basisCount, desc: 'Sektor dengan LQ > 1', bg: 'bg-teal-50', color: 'text-teal-700' },
          { label: 'Maju & Tumbuh Cepat', value: loading ? '-' : klassenData[0], desc: 'Kuadran I Klassen', bg: 'bg-sky-50', color: 'text-sky-700' },
          { label: 'Maju tapi Tertekan', value: loading ? '-' : klassenData[1], desc: 'Kuadran II Klassen', bg: 'bg-amber-50', color: 'text-amber-700' },
          { label: 'Potensial / Tumbuh', value: loading ? '-' : klassenData[2], desc: 'Kuadran III Klassen', bg: 'bg-indigo-50', color: 'text-indigo-700' },
        ].map((item, i) => (
          <div key={i} className={`p-5 rounded-xl border border-white/20 ${item.bg} shadow-sm`}>
            <div className="text-sm font-semibold mb-2 text-slate-600">{item.label}</div>
            <div className={`text-4xl font-bold mb-1 ${item.color}`}>{item.value}</div>
            <div className="text-xs text-slate-500">{item.desc}</div>
          </div>
        ))}
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
                    <th className="px-6 py-4">Sektor Lapangan Usaha</th>
                    <th className="px-6 py-4 text-center">Nilai LQ</th>
                    <th className="px-6 py-4 text-center">Nilai SSA</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500">Memuat data analisis...</td>
                    </tr>
                  ) : lqSummary.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500 italic">Data tidak tersedia. Silakan pilih Kabupaten yang memiliki data PDRB.</td>
                    </tr>
                  ) : (
                    lqSummary.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          {row.sektor}
                          <div className="text-xs font-normal text-slate-400 mt-1">{getKlassenLabel(row.kuadran)}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-mono px-2 py-1 rounded font-semibold ${row.lq >= 1 ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>
                            {row.lq}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-mono ${row.ssa === null ? 'text-slate-400' : (row.ssa > 0 ? 'text-teal-600' : 'text-rose-500')}`}>
                            {row.ssa === null ? '-' : (row.ssa > 0 ? '+' : '') + row.ssa}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.status.includes('Basis') ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
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
                  <div className="bg-teal-100/50 rounded flex flex-col items-center justify-center p-2 text-center text-teal-800 font-semibold border border-teal-200/50 relative">
                    <span className="text-lg">I</span>
                    Maju & Tumbuh
                    <div className="absolute top-1 right-2 text-[10px] bg-teal-200 px-1.5 rounded">{klassenData[0]}</div>
                  </div>
                  {/* Kuadran II */}
                  <div className="bg-sky-100/50 rounded flex flex-col items-center justify-center p-2 text-center text-sky-800 font-semibold border border-sky-200/50 relative">
                    <span className="text-lg">II</span>
                    Maju Tertekan
                    <div className="absolute top-1 right-2 text-[10px] bg-sky-200 px-1.5 rounded">{klassenData[1]}</div>
                  </div>
                  {/* Kuadran III */}
                  <div className="bg-amber-100/50 rounded flex flex-col items-center justify-center p-2 text-center text-amber-800 font-semibold border border-amber-200/50 relative">
                    <span className="text-lg">III</span>
                    Potensial
                    <div className="absolute top-1 right-2 text-[10px] bg-amber-200 px-1.5 rounded">{klassenData[2]}</div>
                  </div>
                  {/* Kuadran IV */}
                  <div className="bg-slate-200/50 rounded flex flex-col items-center justify-center p-2 text-center text-slate-600 font-semibold border border-slate-300/50 relative">
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
    </div>
  );
}
