"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function ProfilPage() {
  const { user } = useAuth();
  
  const [passData, setPassData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: "success" | "error", text: string} | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassData({ ...passData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (passData.new_password !== passData.confirm_password) {
      setMessage({ type: "error", text: "Password baru dan konfirmasi tidak cocok." });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/auth/change-password/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: passData.old_password,
          new_password: passData.new_password
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.old_password ? errData.old_password[0] : "Gagal mengubah password.");
      }

      setMessage({ type: "success", text: "Password berhasil diubah!" });
      setPassData({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const [resetData, setResetData] = useState({
    username: "",
    new_password: ""
  });
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{type: "success" | "error", text: string} | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage(null);

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/admin/reset-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(resetData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal mereset password.");
      }

      const resData = await res.json();
      setResetMessage({ type: "success", text: resData.message });
      setResetData({ username: "", new_password: "" });
    } catch (err: any) {
      setResetMessage({ type: "error", text: err.message });
    } finally {
      setResetLoading(false);
    }
  };

  if (!user) {
    return <div className="p-6">Memuat profil...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Profil Pengguna</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola data diri dan keamanan akun Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data Profil (Read-Only) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Informasi Akun</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-500">Username</p>
              <p className="font-medium text-gray-900">{user.username}</p>
            </div>
            <div>
              <p className="text-gray-500">Nama Lengkap</p>
              <p className="font-medium text-gray-900">{user.first_name || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{user.email || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500">Nomor HP</p>
              <p className="font-medium text-gray-900">{user.profile?.phone_number || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500">Hak Akses</p>
              <p className="font-medium text-indigo-600">{user.is_superuser ? "Super Admin" : "Admin Daerah"}</p>
            </div>
          </div>
        </div>

        {/* Info Lokasi */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Wilayah Kerja</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-500">Asal DPMPTSP Provinsi</p>
              <p className="font-medium text-gray-900">{user.profile?.asal_provinsi || "Seluruh Indonesia (Superadmin)"}</p>
            </div>
            <div>
              <p className="text-gray-500">Asal Kabupaten / Kota</p>
              <p className="font-medium text-gray-900">{user.profile?.asal_kokab || "Semua (Superadmin)"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Ubah Password */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Ganti Password</h2>
        
        {message && (
          <div className={`p-3 rounded-md text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700">Password Lama</label>
            <input 
              type="password" 
              name="old_password"
              required 
              value={passData.old_password} 
              onChange={handleChange} 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password Baru</label>
            <input 
              type="password" 
              name="new_password"
              required 
              value={passData.new_password} 
              onChange={handleChange} 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Konfirmasi Password Baru</label>
            <input 
              type="password" 
              name="confirm_password"
              required 
              value={passData.confirm_password} 
              onChange={handleChange} 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Menyimpan..." : "Simpan Password"}
          </button>
        </form>
      </div>

      {user.is_superuser && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 space-y-4">
          <h2 className="text-lg font-semibold border-b border-red-100 pb-2 text-red-700">Zona Superadmin: Reset Password Pengguna Lain</h2>
          <p className="text-sm text-gray-500">Gunakan fitur ini untuk mengatur ulang kata sandi milik pengguna lain (Admin Daerah).</p>
          
          {resetMessage && (
            <div className={`p-3 rounded-md text-sm ${resetMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {resetMessage.text}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username Target</label>
              <input 
                type="text" 
                name="target_username"
                required 
                value={resetData.username} 
                onChange={(e) => setResetData({...resetData, username: e.target.value})} 
                placeholder="Contoh: user_bogor"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password Baru</label>
              <input 
                type="text" 
                name="target_new_password"
                required 
                value={resetData.new_password} 
                onChange={(e) => setResetData({...resetData, new_password: e.target.value})} 
                placeholder="Masukkan kata sandi baru"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
              />
            </div>
            <button 
              type="submit" 
              disabled={resetLoading}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {resetLoading ? "Mereset..." : "Paksa Reset Password"}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
