"use client";
import CrudTable from "@/components/admin/CrudTable";

export default function DistrictsPage() {
  const columns = [
    { key: "name", label: "Nama Kabupaten" },
    { key: "lat", label: "Latitude", type: "number" as const },
    { key: "lon", label: "Longitude", type: "number" as const },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <CrudTable 
        title="Manajemen Data Kabupaten" 
        endpoint="districts" 
        columns={columns} 
      />
    </div>
  );
}
