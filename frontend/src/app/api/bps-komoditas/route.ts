import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tahun = searchParams.get("tahun") || "2022";
  const wilayah = searchParams.get("wilayah") || "3300000"; // Jateng by default

  const url = `https://webapi.bps.go.id/v1/api/interoperabilitas/datasource/simdasi/id/25/tahun/${tahun}/id_tabel/eHEwRmg2VUZjY2lWNWNYaVhQK1h4QT09/wilayah/${wilayah}/key/fc0afc6a4183d3a4fc65dfc75f7cedbe`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json"
      },
      next: { revalidate: 3600 } // cache for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch from BPS API" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("BPS API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
