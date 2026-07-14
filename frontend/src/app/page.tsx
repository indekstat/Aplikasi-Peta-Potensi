"use client";

import { useEffect, useState } from "react";
import MapWrapper from "@/components/MapWrapper";
import ExpandableList from "@/components/ExpandableList";
import Link from "next/link";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(2024);
  const availableYears = [2022, 2023, 2024, 2025];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        
        // Fetch Provinces & Districts only once
        if (provinces.length === 0) {
          const resProv = await fetch(`${API_BASE}/api/provinces/`);
          setProvinces(await resProv.json());
          
          const resDistricts = await fetch(`${API_BASE}/api/districts/`);
          setDistricts(await resDistricts.json());
        }

        // Fetch LQ data based on selected year
        const resLq = await fetch(`${API_BASE}/api/analysis/lq/?year=${year}`);
        const dataLq = await resLq.json();
        setData(dataLq);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [year]);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-md py-6 px-8 text-white flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Peta Potensi</h1>
          <p className="text-blue-100 mt-2 opacity-90">
            Analisis Sektor dan Komoditas Unggulan menggunakan Location Quotient (LQ)
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="year-select" className="text-sm font-medium">Tahun:</label>
            <select 
              id="year-select"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-white/20 border border-white/30 text-white rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {availableYears.map(y => (
                <option key={y} value={y} className="text-gray-800">{y}</option>
              ))}
            </select>
          </div>
          <Link 
            href="/admin" 
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors border border-white/30 px-5 py-2.5 rounded-lg flex items-center space-x-2 font-semibold text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>Akses Admin</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700">Peta Sebaran Potensi ({year})</h2>
              </div>
              <MapWrapper 
                provinces={provinces}
                districts={districts}
                lqPdrb={data?.lq_pdrb || []}
                lqProd={data?.lq_prod || []}
              />
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
                  <span className="w-2 h-6 bg-blue-500 rounded-full mr-2"></span>
                  Sektor Unggulan Kabupaten (PDRB)
                </h2>
                <ExpandableList 
                  data={data?.lq_pdrb || []} 
                  titleKey="sektor" 
                  valueKey="lq" 
                  color="blue" 
                />
              </section>

              <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
                  <span className="w-2 h-6 bg-green-500 rounded-full mr-2"></span>
                  Komoditas Unggulan Kecamatan (Produksi)
                </h2>
                <ExpandableList 
                  data={data?.lq_prod || []} 
                  titleKey="komoditas" 
                  valueKey="lq" 
                  color="green"
                  subGroupKey="kecamatan"
                />
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
