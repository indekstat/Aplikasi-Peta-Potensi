"use client";
import CrudTable from "@/components/admin/CrudTable";

export default function CommoditiesPage() {
  const columns = [
    { key: "name", label: "Nama Komoditas" },
    { key: "icon", label: "Icon (Emoji)" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <CrudTable 
        title="Manajemen Data Komoditas" 
        endpoint="commodities" 
        columns={columns} 
      />
    </div>
  );
}
