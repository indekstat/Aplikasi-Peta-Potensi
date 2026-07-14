import json
import urllib.request
import os

print("Downloading GADM IDN_2 (Kabupaten)...")
url2 = "https://raw.githubusercontent.com/QueenOfMagician/geomaps_indo/main/data-static-indonesia/geojson-indonesia/gadm41_IDN_2.json"
req2 = urllib.request.Request(url2, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req2) as response:
    data2 = json.loads(response.read().decode())

print("Filtering for Jawa Timur...")
jatim_kab = [f for f in data2['features'] if f['properties'].get('NAME_1') == 'JawaTimur']
data2['features'] = jatim_kab

out2 = os.path.join(os.path.dirname(__file__), '../frontend/public/jatim_kabupaten.geojson')
with open(out2, 'w') as f:
    json.dump(data2, f)
print(f"Saved {len(jatim_kab)} kabupaten to {out2}")

print("Downloading GADM IDN_3 (Kecamatan)...")
url3 = "https://raw.githubusercontent.com/QueenOfMagician/geomaps_indo/main/data-static-indonesia/geojson-indonesia/gadm41_IDN_3.json"
req3 = urllib.request.Request(url3, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req3) as response:
    data3 = json.loads(response.read().decode())

print("Filtering for Jawa Timur...")
jatim_kec = [f for f in data3['features'] if f['properties'].get('NAME_1') == 'JawaTimur']
data3['features'] = jatim_kec

out3 = os.path.join(os.path.dirname(__file__), '../frontend/public/jatim_kecamatan.geojson')
with open(out3, 'w') as f:
    json.dump(data3, f)
print(f"Saved {len(jatim_kec)} kecamatan to {out3}")

print("Done!")
