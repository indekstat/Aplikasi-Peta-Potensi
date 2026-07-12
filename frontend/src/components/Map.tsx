"use client";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapProps {
  lqPdrb: any[];
  lqProd: any[];
  districts: any[];
}

export default function Map({ lqPdrb, lqProd, districts }: MapProps) {
  const javaTimurBounds = L.latLngBounds([-9.0, 110.5], [-6.5, 115.0]);
  const [selectedKab, setSelectedKab] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"sektor" | "komoditas">("sektor");

  // Jika ada kabupaten yg dipilih, ambil data potensinya
  const unggulanSektor = selectedKab 
    ? lqPdrb.filter((l) => l.kabupaten === selectedKab.name).map((l) => l.sektor)
    : [];
    
  const unggulanKomoditas = selectedKab
    ? lqProd.filter((l) => l.kabupaten === selectedKab.name).map((l) => l.komoditas)
    : [];

  return (
    <div className="flex flex-col md:flex-row h-[700px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-xl z-0 bg-white">
      {/* Map Area */}
      <div className="flex-1 relative">
        <MapContainer
          center={[-7.7, 112.5]}
          zoom={8}
          minZoom={8}
          maxZoom={8}
          dragging={false}
          zoomControl={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          maxBounds={javaTimurBounds}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          {districts.map((kab) => {
            if (!kab.lat || !kab.lon) return null;
            
            return (
              <Marker 
                key={kab.id} 
                position={[kab.lat, kab.lon]}
                eventHandlers={{
                  click: () => {
                    setSelectedKab(kab);
                    setActiveTab("sektor");
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <span className="font-semibold text-gray-800">{kab.name}</span>
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Side Panel Area */}
      <div className="w-full md:w-96 bg-white border-l border-gray-200 flex flex-col">
        {selectedKab ? (
          <>
            {/* Panel Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white shrink-0">
              <h3 className="font-bold text-2xl mb-1">{selectedKab.name}</h3>
              <p className="text-blue-100 text-sm opacity-90">Provinsi Jawa Timur</p>
            </div>

            {/* Tabs Header */}
            <div className="flex border-b border-gray-200 shrink-0">
              <button
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "sektor" 
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setActiveTab("sektor")}
              >
                Sektor Unggulan
              </button>
              <button
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "komoditas" 
                    ? "text-green-600 border-b-2 border-green-600 bg-green-50/50" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setActiveTab("komoditas")}
              >
                Komoditas Utama
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {activeTab === "sektor" && (
                <div className="animate-in fade-in duration-300">
                  <div className="flex items-center text-blue-700 mb-4">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <h4 className="font-bold text-lg">Data Sektor Unggulan</h4>
                  </div>
                  
                  {unggulanSektor.length > 0 ? (
                    <div className="space-y-3">
                      {unggulanSektor.map((s, i) => (
                        <div key={i} className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm text-gray-800 shadow-sm">
                          {s}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center text-gray-500 italic">
                      Tidak ada sektor unggulan dominan.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "komoditas" && (
                <div className="animate-in fade-in duration-300">
                  <div className="flex items-center text-green-700 mb-4">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <h4 className="font-bold text-lg">Data Komoditas Utama</h4>
                  </div>

                  {unggulanKomoditas.length > 0 ? (
                    <div className="space-y-3">
                      {unggulanKomoditas.map((c, i) => (
                        <div key={i} className="bg-green-50 border border-green-100 p-3 rounded-lg text-sm text-gray-800 shadow-sm">
                          {c}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center text-gray-500 italic">
                      Tidak ada komoditas utama dominan.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Pilih Wilayah</h3>
            <p className="text-sm">Klik salah satu titik merah (kabupaten/kota) pada peta untuk melihat detail sektor dan komoditas unggulannya.</p>
          </div>
        )}
      </div>
    </div>
  );
}
