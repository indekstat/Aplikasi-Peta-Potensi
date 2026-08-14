"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { BarChart3, Map, Lightbulb, CheckCircle2, PieChart, Users, Eye, EyeOff, LayoutDashboard } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const API_BASE = "";
      const res = await fetch(`${API_BASE}/api/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Login gagal. Periksa username dan password Anda.");
      }

      const data = await res.json();
      login(data.access, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faff] relative overflow-hidden flex flex-col font-sans">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-50/60 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Header */}
      <header className="px-8 lg:px-16 pt-8 relative z-10 flex items-center gap-4">
        <div className="flex items-center gap-2 text-blue-600 font-extrabold text-2xl tracking-tight">
          <LayoutDashboard size={28} className="text-blue-600" />
          REGINA
        </div>
        <div className="h-6 w-px bg-slate-300"></div>
        <div className="text-slate-500 text-sm font-medium">Regional Intelligence Analytics by Indekstat</div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center px-8 lg:px-16 py-8 relative z-10 gap-8">
        
        {/* Left Column (Hero Text & 3 Features) */}
        <div className="w-full lg:w-[40%] flex flex-col justify-center">
          <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 mb-4 leading-[1.15] tracking-tight">
            Selamat Datang<br/>di <span className="text-blue-600">REGINA</span>
          </h1>
          <div className="w-16 h-1.5 bg-blue-600 mb-6 rounded-full"></div>
          
          <p className="text-slate-600 mb-10 leading-relaxed text-[15px] max-w-lg">
            REGINA adalah platform <span className="font-semibold text-blue-600">Regional Intelligence Analytics</span> yang membantu daerah Anda dalam menentukan sektor dan komoditas unggulan daerah, mengeksplorasi peta potensi dan potensi investasi daerah, serta mendukung keputusan investasi berbasis data yang akurat dan terpercaya.
          </p>

          <div className="space-y-4 max-w-lg">
            {/* Feature 1 */}
            <div className="flex gap-4 items-center bg-white p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-blue-50 transition-transform hover:-translate-y-1">
              <div className="bg-[#f0f4ff] text-blue-600 p-3.5 rounded-xl shrink-0">
                <BarChart3 size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-0.5 text-[15px]">Sektor dan Komoditas Unggulan</h3>
                <p className="text-[13px] text-slate-500 leading-snug">Penentuan sektor dan komoditas unggulan melalui perhitungan otomatis, tanpa ribet, dan akurat.</p>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="flex gap-4 items-center bg-white p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-blue-50 transition-transform hover:-translate-y-1">
              <div className="bg-[#f0f4ff] text-blue-600 p-3.5 rounded-xl shrink-0">
                <Map size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-0.5 text-[15px]">Peta Potensi Daerah</h3>
                <p className="text-[13px] text-slate-500 leading-snug">Pemetaan potensi daerah secara spasial untuk melihat sebaran antar wilayah.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-4 items-center bg-white p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-blue-50 transition-transform hover:-translate-y-1">
              <div className="bg-[#f0f4ff] text-blue-600 p-3.5 rounded-xl shrink-0">
                <Lightbulb size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-0.5 text-[15px]">Insight Strategis</h3>
                <p className="text-[13px] text-slate-500 leading-snug">Dapatkan insight berbasis data untuk mendukung perencanaan dan kebijakan yang lebih tepat sasaran.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center Map Graphic */}
        <div className="hidden lg:flex w-[25%] justify-center items-center relative">
          <div className="absolute w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute w-64 h-64 bg-teal-400/10 rounded-full blur-2xl -translate-y-16 translate-x-12"></div>
          
          <div className="relative w-full max-w-[320px] bg-white/80 backdrop-blur-md p-6 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(59,130,246,0.12)] border border-slate-100 rotate-[-4deg] hover:rotate-0 transition-transform duration-700 ease-out z-10 group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-transparent rounded-[2rem]"></div>
            
            {/* Peta Indonesia */}
            <div className="relative z-10 w-full h-[180px] flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
              <img 
                src="/indonesia-map.png" 
                alt="Peta Indonesia" 
                className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(59,130,246,0.15)]"
              />
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-6 -right-4 bg-white p-3 rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-50 animate-bounce" style={{animationDuration: '3s'}}>
              <PieChart size={24} className="text-teal-500" />
            </div>
            
            <div className="absolute -bottom-5 -left-6 bg-white p-4 rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-50 animate-bounce" style={{animationDuration: '4s', animationDelay: '1s'}}>
              <BarChart3 size={28} className="text-blue-500" />
            </div>
            
            <div className="absolute top-1/2 -right-8 bg-white px-3 py-2 rounded-xl shadow-lg shadow-blue-900/5 border border-slate-50 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-[10px] font-bold text-slate-700">Live Data</span>
            </div>
          </div>
        </div>

        {/* Right Column (Login Form) */}
        <div className="w-full lg:w-[35%] flex justify-end">
          <div className="w-full max-w-[420px] bg-white p-8 lg:p-10 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-100 relative">
            <div className="text-center mb-8">
              <div className="inline-flex justify-center items-center w-14 h-14 bg-[#f0f4ff] text-blue-600 rounded-2xl mb-5">
                <LayoutDashboard size={28} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Masuk ke REGINA</h2>
              <p className="text-[13px] text-slate-500 leading-relaxed px-4">
                Akses platform untuk mulai memetakan potensi unggulan daerah Anda secara otomatis dengan dukungan AI cerdas
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 text-center">
                  {error}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 block">Username</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              
              <div className="space-y-1.5 relative">
                <label className="text-xs font-semibold text-slate-600 block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors pr-12"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-4 h-4 cursor-pointer" />
                  <span className="text-xs text-slate-600">Ingat saya</span>
                </label>
                <Link href="#" className="text-xs text-blue-600 font-medium hover:underline">
                  Lupa password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2 text-sm"
              >
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>
            
            <div className="mt-8 text-center text-xs text-slate-500">
              Belum punya akun?{" "}
              <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                Daftar di sini
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Features (3 Horizontal items) */}
      <footer className="relative z-10 bg-white/60 backdrop-blur-md border-t border-slate-200 mt-8 py-5">
        <div className="max-w-6xl mx-auto px-8 flex flex-wrap justify-center gap-x-16 gap-y-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} className="text-blue-600 shrink-0" />
            <div>
              <h4 className="font-bold text-slate-800 text-[13px]">Data Akurat & Terpercaya</h4>
              <p className="text-[11px] text-slate-500">Sumber data resmi BPS</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <PieChart size={22} className="text-blue-600 shrink-0" />
            <div>
              <h4 className="font-bold text-slate-800 text-[13px]">Visualisasi Interaktif</h4>
              <p className="text-[11px] text-slate-500">Mengubah data menjadi insight</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Users size={22} className="text-blue-600 shrink-0" />
            <div>
              <h4 className="font-bold text-slate-800 text-[13px]">Dukungan Profesional</h4>
              <p className="text-[11px] text-slate-500">Ahli Indekstat siap membantu</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
