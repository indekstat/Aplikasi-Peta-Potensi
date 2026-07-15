"use client";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Tooltip } from "react-leaflet";
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
  provinces: any[];
  lqPdrb: any[];
  lqProd: any[];
  districts: any[];
}

export default function Map({ provinces, lqPdrb, lqProd, districts }: MapProps) {
  const javaTimurBounds = L.latLngBounds([-9.0, 110.5], [-6.5, 115.0]);
  const [activeTab, setActiveTab] = useState<"sektor" | "komoditas">("sektor");
  // Sektor State
  const [searchSektor, setSearchSektor] = useState("");
  const [selectedSektor, setSelectedSektor] = useState<string | null>(null);
  const [expandedCatSektor, setExpandedCatSektor] = useState<string | null>("Pertanian & Pertambangan");

  // Komoditas State
  const [searchKomoditas, setSearchKomoditas] = useState("");
  const [selectedCommodity, setSelectedCommodity] = useState<string | null>(null);
  const [expandedCatKomoditas, setExpandedCatKomoditas] = useState<string | null>("Perkebunan");

  const filteredLqPdrb = selectedSektor 
    ? lqPdrb.filter(item => item.sektor === selectedSektor)
    : [];

  const filteredLqProd = selectedCommodity
    ? lqProd.filter(item => item.komoditas === selectedCommodity)
    : [];

  // Custom Leaflet Icons for colors
  const createIcon = (color: string) => {
    return new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  };

  const blueIcon = createIcon('blue');
  const greyIcon = createIcon('grey');
  const greenIcon = createIcon('green');

  const createEmojiIcon = (emoji: string, is_unggulan: boolean) => {
    const bgColor = is_unggulan ? '#ebf8ff' : '#f3f4f6'; // light blue or light grey
    const borderColor = is_unggulan ? '#2563eb' : '#9ca3af'; // blue or grey border
    const html = `
      <div style="
        font-size: 20px; 
        background: ${bgColor}; 
        border: 2px solid ${borderColor}; 
        border-radius: 50%; 
        width: 36px; 
        height: 36px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${emoji}
      </div>
    `;
    return L.divIcon({
      html,
      className: '', // remove default background
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });
  };

  const [geoDataKab, setGeoDataKab] = useState<any>(null);
  const [geoDataKec, setGeoDataKec] = useState<any>(null);
  const [centersKab, setCentersKab] = useState<Record<string, {lat: number, lon: number}>>({});
  const [centersKec, setCentersKec] = useState<Record<string, {lat: number, lon: number}>>({});

  useEffect(() => {
    // Load Kabupaten GeoJSON
    fetch('/jatim_kabupaten.geojson')
      .then(res => res.json())
      .then(data => {
        setGeoDataKab(data);
        const newCentersKab: Record<string, {lat: number, lon: number}> = {};
        if (data.features) {
          data.features.forEach((f: any) => {
            const kabName = f.properties.NAME_2;
            if (kabName) {
              const cleanKab = kabName.toLowerCase().replace(/kota\s+/g, '').replace(/kabupaten\s+/g, '').trim();
              try {
                const layer = L.geoJSON(f);
                const center = layer.getBounds().getCenter();
                newCentersKab[cleanKab] = { lat: center.lat, lon: center.lng };
              } catch (e) {}
            }
          });
        }
        setCentersKab(newCentersKab);
      })
      .catch(err => console.error("Error fetching Kabupaten GeoJSON", err));

    // Load Kecamatan GeoJSON
    fetch('/jatim_kecamatan.geojson')
      .then(res => res.json())
      .then(data => {
        setGeoDataKec(data);
        const newCentersKec: Record<string, {lat: number, lon: number}> = {};
        if (data.features) {
          data.features.forEach((f: any) => {
            const kabName = f.properties.NAME_2;
            const kecName = f.properties.NAME_3;
            if (kabName && kecName) {
              const cleanKab = kabName.toLowerCase().replace(/kota\s+/g, '').replace(/kabupaten\s+/g, '').trim();
              const cleanKec = kecName.toLowerCase().replace(/kecamatan\s+/g, '').trim();
              try {
                const layer = L.geoJSON(f);
                const center = layer.getBounds().getCenter();
                newCentersKec[`${cleanKab}|${cleanKec}`] = { lat: center.lat, lon: center.lng };
              } catch (e) {}
            }
          });
        }
        setCentersKec(newCentersKec);
      })
      .catch(err => console.error("Error fetching Kecamatan GeoJSON", err));
  }, []);

  // Group Sektor for Sidebar
  const categoriesSektor: Record<string, string[]> = {
    "Pertanian & Pertambangan": [], "Industri & Konstruksi": [], "Jasa": [], "Lainnya": []
  };
  const uniqueSektor = Array.from(new Set(lqPdrb.map(item => item.sektor)));
  uniqueSektor.forEach(s => {
    const sl = s.toLowerCase();
    if (sl.includes("pertanian") || sl.includes("kehutanan") || sl.includes("perikanan") || sl.includes("pertambangan")) categoriesSektor["Pertanian & Pertambangan"].push(s);
    else if (sl.includes("industri") || sl.includes("pengadaan") || sl.includes("konstruksi")) categoriesSektor["Industri & Konstruksi"].push(s);
    else if (sl.includes("jasa") || sl.includes("perdagangan") || sl.includes("transportasi") || sl.includes("akomodasi") || sl.includes("informasi") || sl.includes("keuangan") || sl.includes("real estat")) categoriesSektor["Jasa"].push(s);
    else categoriesSektor["Lainnya"].push(s);
  });

  // Group Commodities for Sidebar
  const categoriesKomoditas: Record<string, string[]> = {
    "Perkebunan": [], "Pertanian": [], "Peternakan": [], "Perikanan": [], "Hortikultura": [], "Lainnya": []
  };
  const uniqueCommodities = Array.from(new Set(lqProd.map(item => item.komoditas)));
  uniqueCommodities.forEach(c => {
    const cl = c.toLowerCase();
    if (cl.includes("cengkeh") || cl.includes("kopi") || cl.includes("kakao") || cl.includes("tebu") || cl.includes("kapuk") || cl.includes("kelapa") || cl.includes("mete")) categoriesKomoditas["Perkebunan"].push(c);
    else if (cl.includes("padi") || cl.includes("jagung") || cl.includes("kedelai") || cl.includes("kacang") || cl.includes("ubi") || cl.includes("singkong")) categoriesKomoditas["Pertanian"].push(c);
    else if (cl.includes("sapi") || cl.includes("kambing") || cl.includes("domba") || cl.includes("ayam") || cl.includes("itik") || cl.includes("telur") || cl.includes("susu")) categoriesKomoditas["Peternakan"].push(c);
    else if (cl.includes("ikan") || cl.includes("udang") || cl.includes("lele") || cl.includes("bandeng")) categoriesKomoditas["Perikanan"].push(c);
    else if (cl.includes("mangga") || cl.includes("pisang") || cl.includes("jeruk") || cl.includes("apel") || cl.includes("bawang") || cl.includes("cabai")) categoriesKomoditas["Hortikultura"].push(c);
    else categoriesKomoditas["Lainnya"].push(c);
  });



  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden text-gray-900 font-sans">
      <div className="w-80 bg-white shadow-xl flex flex-col z-[1000] relative">
        <div className="p-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold tracking-wider">CMS Peta Potensi</h2>
          <p className="text-gray-400 text-xs mt-1">Sistem Manajemen Data</p>
        </div>

        <div className="flex border-b border-gray-200">
          <button 
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'sektor' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => { setActiveTab("sektor"); setSelectedCommodity(null); }}
          >
            Sektor Unggulan
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'komoditas' ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => { setActiveTab("komoditas"); setSelectedSektor(null); }}
          >
            Komoditas Utama
          </button>
        </div>

        {activeTab === "sektor" ? (
          <>
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cari sektor..." 
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchSektor}
                  onChange={(e) => setSearchSektor(e.target.value)}
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              {Object.entries(categoriesSektor).map(([catName, items]) => {
                const filteredItems = items.filter(i => i.toLowerCase().includes(searchSektor.toLowerCase()));
                if (filteredItems.length === 0) return null;
                const isExpanded = expandedCatSektor === catName;
                return (
                  <div key={catName} className="border-b border-gray-100">
                    <button 
                      className={`w-full px-4 py-3 flex justify-between items-center text-left ${isExpanded ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                      onClick={() => setExpandedCatSektor(isExpanded ? null : catName)}
                    >
                      <span className="font-semibold text-sm">{catName}</span>
                      <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isExpanded && (
                      <div className="bg-gray-50 py-1">
                        {filteredItems.map(item => (
                          <button key={item} className={`w-full px-8 py-2 text-left text-sm transition-colors ${selectedSektor === item ? 'text-blue-600 font-semibold bg-blue-100/50' : 'text-gray-600 hover:bg-gray-200/50'}`} onClick={() => setSelectedSektor(selectedSektor === item ? null : item)}>{item}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cari komoditas..." 
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={searchKomoditas}
                  onChange={(e) => setSearchKomoditas(e.target.value)}
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              {Object.entries(categoriesKomoditas).map(([catName, items]) => {
                const filteredItems = items.filter(i => i.toLowerCase().includes(searchKomoditas.toLowerCase()));
                if (filteredItems.length === 0) return null;
                const isExpanded = expandedCatKomoditas === catName;
                return (
                  <div key={catName} className="border-b border-gray-100">
                    <button 
                      className={`w-full px-4 py-3 flex justify-between items-center text-left ${isExpanded ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-700'}`}
                      onClick={() => setExpandedCatKomoditas(isExpanded ? null : catName)}
                    >
                      <span className="font-semibold text-sm">{catName}</span>
                      <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isExpanded && (
                      <div className="bg-gray-50 py-1">
                        {filteredItems.map(item => (
                          <button key={item} className={`w-full px-8 py-2 text-left text-sm transition-colors ${selectedCommodity === item ? 'text-green-600 font-semibold bg-green-100/50' : 'text-gray-600 hover:bg-gray-200/50'}`} onClick={() => setSelectedCommodity(selectedCommodity === item ? null : item)}>{item}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 relative">
        <MapContainer
          center={[-7.7, 112.5]}
          zoom={8}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {geoDataKab && activeTab === "sektor" && (
            <GeoJSON 
              key="geojson-sektor"
              data={geoDataKab} 
              style={(feature: any) => {
                const kabName = feature.properties?.NAME_2 || "Unknown";
                const stringToColor = (str: string) => {
                  let hash = 0;
                  for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
                  let color = '#';
                  for (let i = 0; i < 3; i++) { color += ('00' + ((hash >> (i * 8)) & 0xFF).toString(16)).slice(-2); }
                  return color;
                };

                let fillColor = stringToColor(kabName);
                let weight = 1;
                let fillOpacity = 0.2;
                
                if (selectedSektor) {
                  const cleanKab = kabName.toLowerCase().replace(/kota\s+/g, '').replace(/kabupaten\s+/g, '').trim();
                  const match = filteredLqPdrb.find(p => p.kabupaten.toLowerCase().replace(/kota\s+/g, '').replace(/kabupaten\s+/g, '').trim() === cleanKab);
                  
                  if (match) {
                    fillOpacity = match.is_unggulan ? 0.7 : 0.3;
                    weight = match.is_unggulan ? 2 : 1;
                  } else {
                    fillOpacity = 0.05;
                  }
                }
                
                return { color: "#ffffff", weight, opacity: 0.8, fillColor, fillOpacity };
              }}
            />
          )}

          {geoDataKec && activeTab === "komoditas" && (
            <GeoJSON 
              key="geojson-komoditas"
              data={geoDataKec} 
              style={(feature: any) => {
                const kecName = feature.properties?.NAME_3 || "Unknown";
                const kabName = feature.properties?.NAME_2 || "Unknown";
                
                const stringToColor = (str: string) => {
                  let hash = 0;
                  for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
                  let color = '#';
                  for (let i = 0; i < 3; i++) { color += ('00' + ((hash >> (i * 8)) & 0xFF).toString(16)).slice(-2); }
                  return color;
                };

                // Color based on Kecamatan name to differentiate them
                let fillColor = stringToColor(`${kabName}-${kecName}`);
                let weight = 1;
                let fillOpacity = 0.2;
                
                if (selectedCommodity) {
                  const cleanKab = kabName.toLowerCase().replace(/kota\s+/g, '').replace(/kabupaten\s+/g, '').trim();
                  const cleanKec = kecName.toLowerCase().replace(/kecamatan\s+/g, '').trim();
                  const match = filteredLqProd.find(p => 
                    p.kabupaten.toLowerCase().replace(/kota\s+/g, '').replace(/kabupaten\s+/g, '').trim() === cleanKab &&
                    p.kecamatan.toLowerCase().replace(/kecamatan\s+/g, '').trim() === cleanKec
                  );
                  
                  if (match) {
                    fillOpacity = match.is_unggulan ? 0.7 : 0.3;
                    weight = match.is_unggulan ? 2 : 1;
                  } else {
                    fillOpacity = 0.05;
                  }
                }
                
                return { color: "#ffffff", weight, opacity: 0.8, fillColor, fillOpacity };
              }}
            />
          )}
          {activeTab === "sektor" && filteredLqPdrb.map((item: any, idx) => {
            const cleanKab = item.kabupaten.toLowerCase().replace(/kota\s+/g, '').replace(/kabupaten\s+/g, '').trim();
            const baseCenter = centersKab[cleanKab];
            if (!baseCenter) return null;
            const markerIcon = item.icon ? createEmojiIcon(item.icon, item.is_unggulan) : (item.is_unggulan ? blueIcon : greyIcon);
            return (
              <Marker key={idx} position={[baseCenter.lat, baseCenter.lon]} icon={markerIcon}>
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <span className="font-semibold">{item.kabupaten} {item.is_unggulan ? "(Unggulan)" : "(Tidak Unggulan)"}</span>
                </Tooltip>
                <Popup>
                  <div className="p-1 min-w-[200px]">
                    <div className="font-bold text-gray-800 text-sm mb-1">{item.sektor}</div>
                    <div className="text-xs text-gray-600 mb-2">{item.kabupaten}</div>
                    <div className="flex items-center text-xs">
                      <span className={`font-mono px-2 py-0.5 rounded mr-2 font-bold ${item.is_unggulan ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>LQ: {item.lq}</span>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${baseCenter.lat},${baseCenter.lon}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Google
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {activeTab === "komoditas" && filteredLqProd.map((item: any, idx) => {
            const cleanKab = item.kabupaten.toLowerCase().replace(/kota\s+/g, '').replace(/kabupaten\s+/g, '').trim();
            const cleanKec = item.kecamatan.toLowerCase().replace(/kecamatan\s+/g, '').trim();
            
            // Prioritize exact coordinates from DB, fallback to GeoJSON center, fallback to Kab center
            let baseCenter = (item.lat && item.lon && item.lat !== 0) 
              ? { lat: item.lat, lon: item.lon } 
              : (centersKec[`${cleanKab}|${cleanKec}`] || centersKab[cleanKab]);
              
            if (!baseCenter) return null;
            const markerIcon = item.icon ? createEmojiIcon(item.icon, item.is_unggulan) : (item.is_unggulan ? greenIcon : greyIcon);
            return (
              <Marker key={idx} position={[baseCenter.lat, baseCenter.lon]} icon={markerIcon}>
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <span className="font-semibold">{item.kecamatan} {item.is_unggulan ? "(Unggulan)" : "(Tidak Unggulan)"}</span>
                </Tooltip>
                <Popup>
                  <div className="p-1 min-w-[200px]">
                    <div className="font-bold text-gray-800 text-sm mb-1">{item.komoditas}</div>
                    <div className="text-xs text-gray-600 mb-2">{item.kecamatan} - {item.kabupaten}</div>
                    <div className="flex items-center text-xs">
                      <span className={`font-mono px-2 py-0.5 rounded mr-2 font-bold ${item.is_unggulan ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>LQ: {item.lq}</span>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${baseCenter.lat},${baseCenter.lon}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Google
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* Map Mode Switcher Overlay */}
        <div className="absolute top-4 right-4 z-[400] bg-white rounded-lg shadow-md p-1 flex">
          <button
            onClick={() => { setActiveTab("sektor"); setSelectedCommodity(null); }}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
              activeTab === "sektor" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Peta Sektor
          </button>
          <button
            onClick={() => { setActiveTab("komoditas"); setSelectedSektor(null); }}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
              activeTab === "komoditas" ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Peta Komoditas
          </button>
        </div>
      </div>
    </div>
  );
}

