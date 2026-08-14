# Dokumentasi Arsitektur & Alur Aplikasi Peta Potensi (REGINA)

Aplikasi **REGINA (Regional Intelligence Analytics by Indekstat)** adalah sebuah sistem informasi geografis dan analitik data ekonomi daerah. Aplikasi ini dirancang untuk memetakan potensi ekonomi, menganalisis PDRB sektoral, serta memvisualisasikan komoditas unggulan secara geospasial hingga tingkat kecamatan.

---

## 🏗️ 1. Arsitektur Sistem (Tech Stack)

Aplikasi ini menggunakan arsitektur modern pemisahan *Frontend* dan *Backend* (Decoupled Architecture), yang secara keseluruhan dijalankan di dalam kontainer **Docker**.

### **Frontend (Klien/UI)**
*   **Framework:** Next.js (React.js) dengan TypeScript.
*   **Styling:** Tailwind CSS (menghasilkan komponen antarmuka yang modern, responsif, dan interaktif).
*   **Pemetaan (Geospasial):** Menggunakan library kustom `indeksmaps` yang memanfaatkan data statis tipe *GeoJSON* (peta poligon wilayah) yang disimpan secara lokal.
*   **Sistem Routing & State:** Mengandalkan sistem *App Router* bawaan Next.js (`/src/app`) dipadu dengan fungsi React Context (`AuthContext`) untuk menyimpan informasi pengguna yang sedang masuk.

### **Backend (Server & API)**
*   **Framework Utama:** Django (Python) diperkuat dengan ekstensi Django REST Framework (DRF) untuk melayani rute API.
*   **Otentikasi Keamanan:** Berbasis JSON Web Token (JWT) yang diimplementasikan menggunakan paket `rest_framework_simplejwt`.
*   **Database:** PostgreSQL siap pakai untuk lingkungan *Production*, dan SQLite3 secara *default* saat *development*.
*   **Integrasi Pihak Ketiga:** Backend juga mampu bertindak sebagai penarik (*scrapper/fetcher*) ke API BPS terbuka guna mengumpulkan data-data riil komoditas pertanian/perkebunan.

---

## 👥 2. Hak Akses (Role-Based Access)

Aplikasi ini mengklasifikasikan pengguna menjadi dua tingkatan (*level*) utama yang sangat ketat:

1.  **Superadmin (Pusat):**
    *   Memiliki kendali "Dewa" tanpa batasan.
    *   Bisa menelusuri atau mengintip data dari **seluruh** Provinsi dan Kabupaten/Kota di Indonesia.
    *   Bisa menghapus (*wipe*) data PDRB kabupaten secara massal jika diperlukan.
    *   Memiliki menu eksklusif yaitu **Monitoring & Log Data**, di mana Superadmin bisa melacak setiap pergerakan yang dilakukan pengguna lain (Audit Trail), lengkap beserta waktu dan alamat IP perangkat mereka.
2.  **User Daerah (Klien Pemerintah Daerah):**
    *   Akses sistem **terkunci otomatis** (*bound*) pada wilayah asal yang didaftarkan (misal: "Kabupaten Blitar, Jawa Timur").
    *   *Dropdown* pemilihan daerah tidak akan menampilkan wilayah lain, memaksa mereka hanya fokus pada analisis daerah milik sendiri.
    *   Tidak dapat menghapus data massal, mereka hanya bertugas melakukan input Data Entry dan melihat sajian grafik/peta analitik.

---

## 🔄 3. Alur Penggunaan (User Flow) Utama

### **A. Alur Masuk (Authentication Flow)**
1.  Pengguna mengunjungi halaman awal aplikasi yang otomatis diarahkan ke `/login`.
2.  *Frontend* mengambil *Username* dan *Password*, kemudian mengirim permintaan `POST` ke *Backend* (`/api/auth/login/`).
3.  Django merespons dengan memberikan dua "kunci": `access_token` (jangka pendek) dan `refresh_token` (jangka panjang), sekaligus profil singkat (nama, wilayah asal).
4.  *Frontend* menyimpan token tersebut di memori (*localStorage*/*Cookies*).
5.  *Semua interaksi pengguna selanjutnya akan terus menerus divalidasi keabsahannya dengan menyisipkan token ini.*

### **B. Alur Dashboard Utama & Peta (Beranda)**
1.  Setibanya pengguna di `/dashboard`, aplikasi akan langsung membaca posisi wilayah pengguna (Berdasarkan profil, atau pilihan *dropdown* bagi Superadmin).
2.  *Frontend* secara senyap melakukan dua pemanggilan data utama:
    *   Membaca file raksasa `GeoJSON` dari folder lokal, dan memangkas (*filter*) peta tersebut hingga hanya menyisakan bentuk pulau/batas wilayah dari provinsi yang dipilih.
    *   Memanggil kalkulator API Backend (`/api/dashboard/summary/`) yang dengan kilat menghitung nilai analisis matematika (seperti Location Quotient dan Shift Share Analysis).
3.  **Tampilan Disajikan:**
    *   *Bento Grid* (Kotak Informasi): Ringkasan instan berapa Sektor Unggulan yang ditemukan.
    *   *Peta Geospasial*: Sebuah peta daerah di mana wilayah yang sedang dianalisis disorot (*highlight*) menggunakan warna berbeda (Hijau Teal).
    *   *Tabel Sektor & Kuadran Klassen*: Menjabarkan secara rinci posisi setiap sektor perekonomian (Maju Tumbuh Cepat, Potensial, atau Tertinggal).

### **C. Alur Input Data (Data Entry Flow)**
Alur ini krusial karena tanpa data dasar, analitik (LQ/Klassen) tidak akan bisa berjalan.
1.  Pengguna mengakses halaman **Data Entry**.
2.  Terdapat dua tingkat pengisian:
    *   **Level Kabupaten (PDRB):** Jika menu kecamatan dikosongkan. Pengguna akan dimintai untuk mengisi nilai kontribusi dari berbagai *Sektor* industri dan bisnis.
    *   **Level Kecamatan (Produksi Fisik):** Jika kecamatan dipilih, mode input berubah menjadi pendataan komoditas riil (contoh: Padi, Jagung, Tebu, dsb).
3.  Setelah selesai, sistem akan meng-klaim data tersebut menggunakan konsep `Upsert` (Update or Insert) melalui API `/api/save-data/`. Jika data di tahun yang sama sudah pernah ada, maka isinya akan langsung tertimpa (di-update).

### **D. Alur Penarik Data BPS (Automasi)**
Superadmin dimanjakan oleh fitur otomatis ini untuk meringankan beban *Data Entry*:
1.  Superadmin mengakses `/dashboard/komoditas-admin`.
2.  Memilih Tahun dan Wilayah pencarian (Misal: Provinsi Jawa Tengah).
3.  Sistem melakukan pemanggilan pihak ketiga (Web BPS) secara *real-time*.
4.  Sistem mencocokkan string nama daerah dari BPS (misal "KAB. BLORA") dengan nama daerah standar di database internal REGINA ("KABUPATEN BLORA").
5.  Hasil panen / nilai perkebunan untuk wilayah bersangkutan pun terpampang dalam tabel dengan format yang rapi dan seragam.

---

## 📂 4. Rincian Modul Inti (Struktur Folder)

### **Bagian Muka (Frontend: `/frontend/src/app`)**
*   `/login` & `/register` : Gerbang keamanan masuk aplikasi.
*   `/dashboard/page.tsx` : Halaman Jantung Aplikasi (Beranda + Peta Utama).
*   `/dashboard/potensi` : Halaman Potensi Unggulan. Tempat penjabaran matematis detail (Tabel nilai LQ, SSA, dan Tipologi Klassen).
*   `/dashboard/analisa` : Halaman Input Data Analisa (Modul utama *Data Entry* khusus untuk PDRB Kabupaten).
*   `/dashboard/komoditas` : Halaman visualisasi spasial alternatif (Berbentuk Heatmap Komoditas).
*   `/dashboard/data-entry` : Modul *Data Entry* untuk Produksi Komoditas tingkat Kecamatan (Leveling).
*   `/dashboard/monitoring` : Menara Pantau (Eksklusif Superadmin) untuk mengawasi sistem.

### **Bagian Belakang (Backend: `/backend/api`)**
*   `models.py` : Desain Struktur Database (Tabel Provinsi, Kabupaten, PDRB, Data Komoditas, Profil Pengguna).
*   `views_auth.py` : Berisi mesin validasi identitas, pendaftaran akun baru, hingga pergantian kata sandi.
*   `views_dashboard.py` : *The Brain* (Otak). Tempat di mana fungsi matematika kompleks dijalankan. Menggabungkan data PDRB referensi dengan data PDRB total untuk memunculkan Tipologi Klassen.
*   `views_save.py` : Penjaga gerbang lalu lintas masuknya data (*Data Entry*).
*   `views_superadmin.py` : Memiliki otoritas lebih tinggi untuk membaca Log (Rekam Jejak) dan menjalankan operasi hapus massal berbahaya.
