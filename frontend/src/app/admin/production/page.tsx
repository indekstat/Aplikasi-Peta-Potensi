"use client";
import { useEffect, useState } from "react";
import CrudTable, { ColumnDef } from "@/components/admin/CrudTable";

export default function ProductionPage() {
  const [districts, setDistricts] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7031";
    Promise.all([
      fetch(`${API_BASE}/api/districts/`).then(res => res.json()),
      fetch(`${API_BASE}/api/commodities/`).then(res => res.json())
    ]).then(([d, c]) => {
      setDistricts(d);
      setCommodities(c);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8">Memuat pengaturan tabel...</div>;

  const columns: ColumnDef[] = [
    { 
      key: "district", 
      label: "Kabupaten", 
      type: "select",
      options: [
        { value: "", label: "PROVINSI (Total/Tanpa Kabupaten)" },
        ...districts.map(d => ({ value: d.id, label: d.name }))
      ]
    },
    { 
      key: "commodity", 
      label: "Komoditas", 
      type: "select",
      options: commodities.map(c => ({ value: c.id, label: c.name }))
    },
    { 
      key: "value", 
      label: "Kuantitas Produksi", 
      type: "number"
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl mb-6 text-sm">
        <strong>Info:</strong> Kosongkan pilihan Kabupaten (Pilih "PROVINSI") jika data ini adalah total produksi Provinsi Jawa Timur untuk komoditas tersebut.
      </div>
      <CrudTable 
        title="Manajemen Data Produksi" 
        endpoint="production" 
        columns={columns} 
      />
    </div>
  );
}
