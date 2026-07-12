"use client";
import { useEffect, useState } from "react";
import CrudTable, { ColumnDef } from "@/components/admin/CrudTable";

export default function PdrbPage() {
  const [districts, setDistricts] = useState<any[]>([]);
  const [subsectors, setSubsectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7031";
    Promise.all([
      fetch(`${API_BASE}/api/districts/`).then(res => res.json()),
      fetch(`${API_BASE}/api/subsectors/`).then(res => res.json())
    ]).then(([d, s]) => {
      setDistricts(d);
      setSubsectors(s);
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
      key: "subsector", 
      label: "Sektor", 
      type: "select",
      options: subsectors.map(s => ({ value: s.id, label: s.name }))
    },
    { 
      key: "value", 
      label: "Nilai PDRB", 
      type: "number"
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl mb-6 text-sm">
        <strong>Info:</strong> Kosongkan pilihan Kabupaten (Pilih "PROVINSI") jika data ini adalah total agregat PDRB Provinsi Jawa Timur untuk sektor tersebut.
      </div>
      <CrudTable 
        title="Manajemen Data PDRB Sektor" 
        endpoint="pdrb" 
        columns={columns} 
      />
    </div>
  );
}
