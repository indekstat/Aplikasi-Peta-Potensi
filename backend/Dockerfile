FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Data desa Podes dan rekap koperasi (berkas ringkas di api/data/, ikut di image) diimpor sekali, hanya bila tabelnya masih kosong.
# Kegagalan impor tidak menghentikan server; fitur lain tetap jalan dan peringatannya tampil di log.
CMD python manage.py makemigrations api && python manage.py migrate && (python manage.py import_podes --bila-kosong || echo "PERINGATAN: data Podes gagal diimpor, pilihan desa akun koperasi akan kosong") && (python manage.py import_koperasi --bila-kosong || echo "PERINGATAN: data koperasi gagal diimpor, halaman Overview Koperasi akan kosong") && python manage.py runserver 0.0.0.0:8000
