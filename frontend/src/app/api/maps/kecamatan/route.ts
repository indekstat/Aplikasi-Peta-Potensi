import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache the parsed GeoJSON in memory on the server to prevent re-reading/re-parsing on every request
let cachedGeoJSON: any = null;

const isMatchingDistrict = (geojsonName: string, dbName: string) => {
  if (!geojsonName || !dbName) return false;
  const clean = (s: string) => s.toLowerCase()
    .replace(/kabupaten|kota/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  return clean(geojsonName) === clean(dbName);
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kabName = searchParams.get('kab_name');

    if (!kabName) {
      return NextResponse.json({ error: 'kab_name query parameter is required' }, { status: 400 });
    }

    if (!cachedGeoJSON) {
      const filePath = path.join(process.cwd(), 'public/maps/geomaps_indo/indeksmaps/public/gadm41_IDN_3.json');
      if (!fs.existsSync(filePath)) {
        console.error(`Map file not found at path: ${filePath}`);
        return NextResponse.json({ error: 'Boundary map file not found on server', path_checked: filePath }, { status: 404 });
      }
      const rawData = fs.readFileSync(filePath, 'utf8');
      cachedGeoJSON = JSON.parse(rawData);
    }

    const targetDist = kabName.toLowerCase();
    const filteredFeatures = cachedGeoJSON.features.filter((f: any) => {
      return isMatchingDistrict(f.properties.NAME_2, targetDist);
    });

    return NextResponse.json({
      type: "FeatureCollection",
      features: filteredFeatures
    });
  } catch (error: any) {
    console.error('Error in /api/maps/kecamatan route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
