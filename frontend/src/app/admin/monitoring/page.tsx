"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function MonitoringPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"USERS" | "LOGS" | "DATA">("USERS");

  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [pdrbData, setPdrbData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (user && !user.is_superuser) {
      router.push("/admin/analisa");
    }
  }, [user, router]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const headers = { "Authorization": `Bearer ${token}` };

        if (activeTab === "USERS") {
          const res = await fetch(`${API_BASE}/api/admin/users/`, { headers });
          if (res.ok) setUsers(await res.json());
        } else if (activeTab === "LOGS") {
          const res = await fetch(`${API_BASE}/api/admin/activities/`, { headers });
          if (res.ok) setLogs(await res.json());
        } else if (activeTab === "DATA") {
          const res = await fetch(`${API_BASE}/api/admin/pdrb-summary/`, { headers });
          if (res.ok) setPdrbData(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    if (user?.is_superuser) {
      fetchData();
    }
  }, [activeTab, user, API_BASE]);

  if (!user || !user.is_superuser) return <div className="p-8">Memuat...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Monitoring & Log Data</h1>
          <p className="text-sm text-gray-500 mt-1">Halaman khusus Superadmin untuk memantau pengguna dan data PDRB.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex border-b">
          {["USERS", "LOGS", "DATA"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === tab 
                  ? "border-b-2 border-indigo-600 text-indigo-600" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "USERS" ? "Daftar Pengguna" : tab === "LOGS" ? "Log Aktivitas" : "Rekap Data PDRB"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-500">Memuat data...</div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === "USERS" && (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-500">Username</th>
                    <th className="px-4 py-2 text-left text-gray-500">Nama</th>
                    <th className="px-4 py-2 text-left text-gray-500">Email</th>
                    <th className="px-4 py-2 text-left text-gray-500">Asal Provinsi</th>
                    <th className="px-4 py-2 text-left text-gray-500">Asal Kokab</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{u.username}</td>
                      <td className="px-4 py-2">{u.first_name}</td>
                      <td className="px-4 py-2">{u.email}</td>
                      <td className="px-4 py-2">{u.profile?.asal_provinsi || '-'}</td>
                      <td className="px-4 py-2">{u.profile?.asal_kokab || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "LOGS" && (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-500">Waktu</th>
                    <th className="px-4 py-2 text-left text-gray-500">Pengguna</th>
                    <th className="px-4 py-2 text-left text-gray-500">Kokab</th>
                    <th className="px-4 py-2 text-left text-gray-500">Aksi</th>
                    <th className="px-4 py-2 text-left text-gray-500">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2 font-medium">{log.username}</td>
                      <td className="px-4 py-2">{log.kokab || '-'}</td>
                      <td className="px-4 py-2 text-blue-600">{log.action}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{log.ip_address}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Belum ada log aktivitas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "DATA" && (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-500">Provinsi</th>
                    <th className="px-4 py-2 text-left text-gray-500">Kabupaten/Kota</th>
                    <th className="px-4 py-2 text-left text-gray-500">Tahun</th>
                    <th className="px-4 py-2 text-right text-gray-500">Jumlah Sektor Terisi</th>
                    <th className="px-4 py-2 text-right text-gray-500">Total Nilai PDRB (Miliar Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pdrbData.map((d, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600">{d.district__province__name || '-'}</td>
                      <td className="px-4 py-2 font-medium">{d.district__name || '-'}</td>
                      <td className="px-4 py-2">{d.year}</td>
                      <td className="px-4 py-2 text-right">{d.count} sektor</td>
                      <td className="px-4 py-2 text-right font-medium text-green-700">{d.total_value?.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {pdrbData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Belum ada data PDRB di database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
