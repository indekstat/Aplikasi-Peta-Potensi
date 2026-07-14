"use client";
import CrudTable from "@/components/admin/CrudTable";

export default function SubsectorsPage() {
  const columns = [
    { key: "name", label: "Nama Sektor" },
    { key: "icon", label: "Icon (Emoji)" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <CrudTable 
        title="Manajemen Data Sektor PDRB" 
        endpoint="subsectors" 
        columns={columns} 
      />
    </div>
  );
}
