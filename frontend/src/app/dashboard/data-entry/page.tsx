"use client";

import { useEffect, useState } from "react";

const GEOJSON_URL = 'https://raw.githubusercontent.com/ardian28/GeoJson-Indonesia-38-Provinsi/main/Kabupaten/38%20Provinsi%20Indonesia%20-%20Kabupaten.json';

export default function DataEntryPage() {
  const [hierarchy, setHierarchy] = useState<Record<string, string[]>>({});
  const [selectedKab, setSelectedKab] = useState("");
  const [selectedKec, setSelectedKec] = useState("");
  const [selectedYear, setSelectedYear] = useState(2024);
  
  const [subsectors, setSubsectors] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [pdrbData, setPdrbData] = useState<any[]>([]);
  const [productionData, setProductionData] = useState<any[]>([]);
  
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const API_BASE = "";

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch GeoJSON
        const geoRes = await fetch(GEOJSON_URL);
        const geoData = await geoRes.json();
        
        const jatim = geoData.features.filter((f: any) => f.properties?.WADMPR?.toLowerCase() === 'jawa timur');
        const h: Record<string, Set<string>> = {};
        
        jatim.forEach((f: any) => {
          const props = f.properties;
          let kab = props.WADMKK || props.KABKOT || props.KABUPATEN;
          if (kab) {
            kab = titleCase(kab);
            if (!h[kab]) {
              h[kab] = new Set([
                `${kab} Utara`,
                `${kab} Selatan`,
                `${kab} Tengah`,
                `${kab} Timur`,
                `${kab} Barat`
              ]);
            }
          }
        });
        
        const sortedH: Record<string, string[]> = {};
        Object.keys(h).sort().forEach(k => {
          sortedH[k] = Array.from(h[k]).sort();
        });
        setHierarchy(sortedH);

        // Fetch Subsectors & Commodities
        const resSub = await fetch(`${API_BASE}/api/subsectors/`);
        setSubsectors(await resSub.json());
        
        const resCom = await fetch(`${API_BASE}/api/commodities/`);
        setCommodities(await resCom.json());
        
      } catch (err) {
        console.error("Error fetching init data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [API_BASE]);

  // Fetch actual values when selection changes
  useEffect(() => {
    const fetchValues = async () => {
      if (!selectedKab) return;
      setLoading(true);
      
      try {
        if (!selectedKec) {
          // Fetch PDRB
          const resPdrb = await fetch(`${API_BASE}/api/pdrb/`);
          const allPdrb = await resPdrb.json();
          const filtered = allPdrb.filter((p: any) => p.year === selectedYear && p.district_name === selectedKab);
          
          const newVals: Record<string, string> = {};
          filtered.forEach((p: any) => {
            newVals[p.subsector] = p.value.toString();
          });
          setFormValues(newVals);
        } else {
          // Fetch Production
          const resProd = await fetch(`${API_BASE}/api/production/`);
          const allProd = await resProd.json();
          const filtered = allProd.filter((p: any) => p.year === selectedYear && p.subdistrict_name === selectedKec);
          
          const newVals: Record<string, string> = {};
          filtered.forEach((p: any) => {
            newVals[p.commodity] = p.value.toString();
          });
          setFormValues(newVals);
        }
      } catch (err) {
        console.error("Error fetching existing data", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchValues();
  }, [selectedKab, selectedKec, selectedYear, API_BASE]);

  const titleCase = (str: string) => {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleInputChange = (id: string, val: string) => {
    setFormValues(prev => ({ ...prev, [id]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg("");
    try {
      const type = selectedKec ? "production" : "pdrb";
      
      const payload = {
        type,
        year: selectedYear,
        kab_name: selectedKab,
        kec_name: selectedKec || null,
        data: formValues
      };
      
      const res = await fetch(`${API_BASE}/api/save-data/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setSuccessMsg("Data berhasil disimpan!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        alert("Gagal menyimpan data.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && Object.keys(hierarchy).length === 0) return <div className="p-8">Memuat Data Wilayah...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold mb-6">Leveling Data Entry</h1>
      
      {successMsg && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
          {successMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-end mb-8 bg-gray-50 p-4 rounded border">
        <div>
          <label className="block text-sm font-medium mb-1">Tahun</label>
          <select 
            className="border p-2 rounded"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2022, 2023, 2024, 2025].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Kabupaten</label>
          <select 
            className="border p-2 rounded"
            value={selectedKab}
            onChange={(e) => {
              setSelectedKab(e.target.value);
              setSelectedKec("");
              setFormValues({});
            }}
          >
            <option value="">-- Pilih Kabupaten --</option>
            {Object.keys(hierarchy).map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Kecamatan</label>
          <select 
            className="border p-2 rounded"
            value={selectedKec}
            onChange={(e) => {
              setSelectedKec(e.target.value);
              setFormValues({});
            }}
            disabled={!selectedKab}
          >
            <option value="">-- Kosongkan untuk Input PDRB Kabupaten --</option>
            {selectedKab && hierarchy[selectedKab]?.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedKab ? (
        <div className="text-gray-500 italic">Silakan pilih Kabupaten terlebih dahulu.</div>
      ) : loading ? (
        <div className="text-gray-500">Memuat form...</div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {selectedKec 
              ? `Input Produksi Komoditas untuk ${selectedKec}, ${selectedKab}`
              : `Input PDRB Sektor untuk ${selectedKab}`
            }
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {selectedKec ? 'Komoditas' : 'Sektor'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nilai
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(selectedKec ? commodities : subsectors).map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input 
                        type="number" 
                        step="any"
                        className="border rounded px-2 py-1 w-full max-w-xs focus:ring-blue-500 focus:border-blue-500"
                        value={formValues[item.id] || ""}
                        onChange={(e) => handleInputChange(item.id.toString(), e.target.value)}
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
