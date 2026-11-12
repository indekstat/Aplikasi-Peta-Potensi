"use client";

import { Network } from "lucide-react";

export default function MappingBisnisModelPage() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Mapping Bisnis Model</h1>
        <p className="mt-1 text-sm text-slate-500">Pemetaan model bisnis koperasi desa.</p>
      </header>
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 flex flex-col items-center gap-3 text-center">
        <Network size={32} className="text-slate-300" />
        <p className="font-semibold text-slate-700">Menu ini sedang disiapkan</p>
        <p className="text-sm text-slate-500 max-w-md">
          Fitur Mapping Bisnis Model akan tersedia setelah isi dan alurnya ditetapkan.
        </p>
      </div>
    </div>
  );
}
