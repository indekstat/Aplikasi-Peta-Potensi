"use client";

import { useState, useEffect } from "react";

export interface ColumnDef {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: { value: any; label: string }[];
}

interface CrudTableProps {
  title: string;
  endpoint: string;
  columns: ColumnDef[];
}

export default function CrudTable({ title, endpoint, columns }: CrudTableProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);
  
  const API_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:7031"}/api/${endpoint}/`;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [endpoint]);

  const handleSave = async (id: any) => {
    try {
      const isNew = id === "new";
      const method = isNew ? "POST" : "PUT";
      const url = isNew ? API_URL : `${API_URL}${id}/`;
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        await fetchData();
        setEditingId(null);
        setIsAdding(false);
      } else {
        alert("Gagal menyimpan data!");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan.");
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("Yakin ingin menghapus data ini?")) return;
    try {
      const res = await fetch(`${API_URL}${id}/`, { method: "DELETE" });
      if (res.ok) {
        await fetchData();
      } else {
        alert("Gagal menghapus data!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <button 
          onClick={() => {
            setIsAdding(true);
            setEditingId("new");
            setEditForm({});
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Tambah Data
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">ID</th>
              {columns.map(col => (
                <th key={col.key} className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">{col.label}</th>
              ))}
              <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isAdding && (
              <tr className="bg-blue-50/30">
                <td className="px-6 py-4 text-gray-500 text-xs italic">Baru</td>
                {columns.map(col => (
                  <td key={col.key} className="px-6 py-4">
                    {col.type === "select" ? (
                      <select 
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                        value={editForm[col.key] || ""}
                        onChange={(e) => setEditForm({...editForm, [col.key]: e.target.value})}
                      >
                        <option value="">-- Pilih --</option>
                        {col.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    ) : (
                      <input 
                        type={col.type === "number" ? "number" : "text"}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                        value={editForm[col.key] || ""}
                        onChange={(e) => setEditForm({...editForm, [col.key]: e.target.value})}
                      />
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => handleSave("new")} className="text-green-600 hover:text-green-800 font-medium">Simpan</button>
                  <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-gray-500 hover:text-gray-700 font-medium">Batal</button>
                </td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-6 py-8 text-center text-gray-500">Memuat data...</td>
              </tr>
            ) : data.length === 0 && !isAdding ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-6 py-8 text-center text-gray-500 italic">Belum ada data tersedia.</td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{row.id}</td>
                  {columns.map(col => (
                    <td key={col.key} className="px-6 py-4">
                      {editingId === row.id ? (
                        col.type === "select" ? (
                          <select 
                            className="w-full border border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                            value={editForm[col.key] || ""}
                            onChange={(e) => setEditForm({...editForm, [col.key]: e.target.value})}
                          >
                            <option value="">-- Pilih --</option>
                            {col.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        ) : (
                          <input 
                            type={col.type === "number" ? "number" : "text"}
                            className="w-full border border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                            value={editForm[col.key] || ""}
                            onChange={(e) => setEditForm({...editForm, [col.key]: e.target.value})}
                          />
                        )
                      ) : (
                        col.type === "select" 
                          ? (col.options?.find(o => o.value == row[col.key])?.label || row[col.key])
                          : row[col.key]
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                    {editingId === row.id ? (
                      <>
                        <button onClick={() => handleSave(row.id)} className="text-green-600 hover:text-green-800 font-medium">Simpan</button>
                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 font-medium">Batal</button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => { setEditingId(row.id); setEditForm({...row}); }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >Edit</button>
                        <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-800 font-medium">Hapus</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
