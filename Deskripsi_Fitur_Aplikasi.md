# Definisi dan Breakdown Fitur Aplikasi Peta Potensi Daerah

**Tujuan Utama:** Aplikasi ini merupakan alat bantu untuk melakukan perhitungan dan analisis ekonomi daerah, khususnya menggunakan metode Location Quotient (LQ), Shift Share Analysis (SSA), dan Tipologi Klassen.

Berikut adalah rincian seluruh fitur aplikasi yang ada saat ini:

## 1. Autentikasi dan Manajemen Pengguna
*   **Pendaftaran Akun:** Pengguna baru dapat mendaftar dengan melengkapi data diri, meliputi: Nama, Asal instansi (DPMPTSP Provinsi), Kabupaten/Kota (Kokab), Email, dan Nomor HP.
*   **Sistem Login:** Aplikasi berbasis login, di mana hanya pengguna yang memiliki akun terdaftar yang dapat mengakses fitur-fitur utama.
*   **Sistem Peran (Role):** Membedakan akses antara User biasa dan Superadmin. User biasa (dari DPMPTSP Provinsi/Kabupaten) melihat data sesuai wilayahnya, sementara Superadmin dapat mengakses dan memonitor seluruh data.

## 2. Integrasi Data Eksternal (API BPS)
*   **Akses Data PDRB Provinsi:** Sistem dapat menarik data PDRB tingkat Provinsi secara langsung dan otomatis dari API SIMDASI BPS.
*   **Pemilihan Tahun dan Wilayah:** Pengguna dapat memilih data berdasarkan rentang tahun dari 2019 hingga 2025. Data mencakup seluruh 38 Provinsi di Indonesia (lengkap beserta kode wilayah BPS masing-masing dari Aceh hingga Papua Barat Daya).

## 3. Modul Input Data PDRB Kokab
*   **Form Input Analisa LQ & SSA:** Menu khusus di mana User maupun Superadmin dapat memasukkan data PDRB Kabupaten/Kota masing-masing secara manual.
*   **Kategorisasi Sektor & Tahun:** Input data didasarkan pada 17 Sektor Lapangan Usaha Utama dan untuk tahun tertentu (2019 - 2025).
*   **Validasi Keamanan:** Terdapat *popup* konfirmasi untuk mencegah kesalahan input sebelum sistem menyimpan data PDRB secara permanen ke dalam basis data.

## 4. Modul Analisis Ekonomi Daerah (REGINA)
Aplikasi memiliki mesin perhitungan utama untuk menganalisis PDRB serta memvisualisasikannya pada Dashboard Utama yang dikenal sebagai **Regional Intelligence Analytics (REGINA)**:
*   **Analisis Location Quotient (LQ):** Digunakan untuk mengidentifikasi sektor basis atau unggulan dari suatu Kabupaten/Kota jika data yang tersedia hanya untuk 1 (satu) tahun. Analisis ini membandingkan rasio PDRB sektoral Kokab terhadap PDRB total Kokab, disandingkan dengan rasio yang sama di tingkat Provinsi.
*   **Shift Share Analysis (SSA):** Analisis pertumbuhan ekonomi sektoral beruntun yang mengharuskan ketersediaan data untuk beberapa tahun.
*   **Analisis Tipologi Klassen:** Dengan input data PDRB multi-tahun untuk 17 sektor utama, sistem akan mengklasifikasikan sektor-sektor tersebut ke dalam 4 (empat) kuadran pertumbuhan (Maju & Tumbuh, Potensial/Tumbuh Cepat, Maju Tertekan, Relatif Tertinggal).
*   **Peta Potensi Geospasial (Heatmap):** Visualisasi geospasial konsentrasi produksi komoditas dan sebaran sektor unggulan di setiap Kabupaten/Kota menggunakan peta interaktif.
*   **Dashboard Visualisasi Analisis:** Halaman Potensi Unggulan Daerah untuk memvisualisasikan tren perkembangan kontribusi sektor dalam bentuk grafik garis (Line Chart), tabel ringkasan, serta diagram kuadran Tipologi Klassen interaktif.

## 5. Referensi Komoditas
*   **Menu Daftar Komoditas per Kota/Kab:** Halaman yang digunakan untuk menampilkan referensi data komoditas per Kabupaten/Kota.
*   **Data Dinamis BPS:** Menu ini mengambil data secara langsung (real-time/dinamis) dari API SIMDASI BPS untuk kategori komoditas spesifik seperti "Sayuran & Buah-buahan" dan "Tanaman Perkebunan".
*   **Informasi Rinci:** Menampilkan daftar nama komoditas lengkap dengan besaran nilai dan satuannya per daerah.

## 6. Dashboard Superadmin (Monitoring Data)
Menu eksklusif yang hanya dapat diakses oleh *Superadmin* untuk mengelola keseluruhan data yang masuk.
*   **Rekapitulasi Data:** Menampilkan rangkuman atau jumlah data yang telah masuk berdasarkan masing-masing Kabupaten/Kota.
*   **Manajemen Penghapusan Spesifik:** Superadmin dapat menghapus data tertentu menggunakan filter berdasarkan Tahun dan nama Kokab.
*   **Tombol Darurat (Wipe Data):** Terdapat opsi darurat untuk menghapus seluruh data pada sistem ("Hapus Semua Data"). Untuk menghindari unsur ketidaksengajaan, aksi ini diamankan dengan keharusan mengetik kata "HAPUS" secara manual sebagai konfirmasi.

## 7. Akun Koperasi Desa (data Podes 2025)
*   **Pendaftaran akun desa:** Di halaman daftar tersedia pilihan jenis akun "Koperasi Desa". Desa dipilih bertingkat (Provinsi → Kabupaten/Kota → Kecamatan → Desa) dari data Podes 2025. Satu desa hanya dapat memiliki satu akun; desa yang sudah terdaftar tidak muncul lagi di pilihan, dan dicegah juga di level database. Desa dikenali lewat kode `iddesa` (nama desa tidak unik: 7.458 nama muncul lebih dari sekali).
*   **Dua menu:** akun koperasi hanya melihat "Komoditas Unggulan Desa" dan "Mapping Bisnis Model". Halaman analisis daerah dialihkan, dan akun ini tidak dapat menyimpan data PDRB/produksi.
*   **Komoditas Unggulan Desa:** menampilkan data Podes desa akun tersebut. Untuk sementara hanya blok 906 (lapangan usaha, sub sektor, dan komoditas utama penduduk) dan blok 907 (industri mikro-kecil, sentra industri, dan produk sentra).
*   **Mapping Bisnis Model:** halaman masih kosong menunggu isi dan alurnya ditetapkan.
*   **Data Podes ikut di dalam aplikasi, tanpa Excel 106 MB:** hanya kolom yang dipakai (identitas desa, blok 906 dan 907) yang disimpan di `backend/api/data/` (sekitar 1 MB). Saat container start, `import_podes --bila-kosong` memuatnya otomatis sekali saja; cukup `docker compose up --build`.
*   **Memperbarui data Podes (pengembang):** letakkan Excel Podes di folder `Data Podes`, jalankan `pip install -r requirements-dev.txt` lalu `python manage.py export_podes_ringkas`, kemudian commit dua berkas di `backend/api/data/`. Excel aslinya tidak perlu di-commit maupun di-deploy.
