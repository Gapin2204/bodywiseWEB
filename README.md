# BODYWISE

BODYWISE adalah frontend HTML, CSS, dan JavaScript vanilla dengan backend Express dan MySQL/MariaDB opsional untuk data akun.

## Menjalankan frontend saja

Frontend statis dapat disajikan untuk melihat halaman publik. Halaman yang menggunakan API memerlukan konfigurasi backend di bawah.

```powershell
py -m http.server 8000
```

## Menjalankan API lokal

1. Siapkan MySQL 8+ atau MariaDB yang mendukung InnoDB. Untuk instalasi baru, jalankan `backend/sql/migrations/001_create_bodywise_app_database.sql`, `backend/sql/schema.sql`, lalu migrasi `002_food_nutrition_catalog.sql`, `003_food_csv_catalog_fields.sql`, dan `004_workout_program.sql` melalui HeidiSQL. Untuk database `bodywise_app` yang sudah ada, jalankan migrasi 002, 003, dan 004 satu kali sebelum impor dataset terkait. Database lama `bodywise` tidak diubah atau dihapus, dan data lama tidak disalin otomatis.
2. Salin `backend/.env.example` menjadi `backend/.env`. Isi variabel koneksi ke `bodywise_app` dan buat secret JWT acak minimal 32 karakter. Jangan commit `.env`.
3. Dari folder proyek utama atau folder `backend`, jalankan:

   ```powershell
   npm start
   ```

   Dependensi backend ada di `backend`; untuk instalasi baru, jalankan `npm --prefix backend install` terlebih dahulu. Tes otomatis dapat dijalankan dari folder proyek utama dengan `npm test`.

4. Buka `http://localhost:3000`. Express menyajikan frontend yang ada dan API pada origin yang sama. `GET /api/health` memeriksa API, koneksi database, dan kolom schema yang diperlukan; startup juga menolak database dengan schema yang tidak cocok.
5. Gunakan origin yang sama untuk frontend dan API secara default. Untuk frontend pada origin terpisah, set `FRONTEND_ORIGIN` pada backend dan tetapkan `window.BODYWISE_API_BASE` sebelum memuat `js/api.js`; host frontend juga harus mengizinkan backend pada kebijakan `connect-src`. Untuk cookie lintas situs, gunakan HTTPS, `COOKIE_SAME_SITE=None`, dan origin yang spesifik.

Relasi utama: satu `users` ke satu `user_profiles`; `users` ke banyak `body_assessments`, `weight_goals`, `food_logs`, `workout_sessions`, `weight_logs`, `daily_habits`, dan `chat_conversations`; setiap `workout_sessions` ke banyak `workout_sets`; setiap `chat_conversations` ke banyak `chat_messages`. `food_catalog` dan `exercises` adalah katalog bersama yang dapat dirujuk oleh banyak log/sesi. Kunci asing menghapus data pribadi turunannya saat akun dihapus.

## Interaksi

- Buka dan tutup menu navigasi dengan tombol hamburger pada tampilan mobile.
- Ubah mode terang/gelap melalui tombol tema di navigasi; pilihan tema tersimpan di browser.
- Sesi menggunakan JWT berumur 8 jam dalam cookie `HttpOnly`; token tidak disimpan di `localStorage`. Logout menghapus cookie pada browser. Karena JWT bersifat stateless, salinan token yang dicuri tetap berlaku sampai kedaluwarsa.
- `localStorage` hanya dipakai untuk preferensi tema. Profil, nutrisi, latihan, kebiasaan, dan progres diambil dari API.

## API

Semua respons memakai `{ "success": true, "data": ... }` atau `{ "success": false, "error": { "code": ..., "message": ... } }`. Endpoint privat memerlukan cookie sesi dan data selalu dibatasi dengan ID pengguna hasil verifikasi token.

| Metode | Endpoint | Fungsi |
| --- | --- | --- |
| POST | `/api/auth/register` | Membuat akun |
| POST | `/api/auth/login` | Membuat sesi |
| GET | `/api/auth/me` | Pengguna aktif |
| POST | `/api/auth/logout` | Menghapus cookie sesi |
| GET, PUT | `/api/profile` | Membaca/memperbarui profil |
| POST, GET | `/api/assessments` | Menyimpan/membaca asesmen |
| POST, GET, PATCH | `/api/goals`, `/api/goals/:id` | Mengelola target berat |
| GET | `/api/foods?search=` | Mencari katalog makanan |
| GET | `/api/nutrition-recommendations?date=YYYY-MM-DD` | Memberi ide makanan dari katalog sesuai target dan filter lemak |
| GET, POST | `/api/food-logs?date=YYYY-MM-DD` | Membaca/mencatat makanan |
| DELETE | `/api/food-logs/:id` | Menghapus catatan makanan |
| GET | `/api/exercises?search=&category=` | Mencari katalog latihan |
| GET | `/api/workout-program?date=YYYY-MM-DD` | Membaca program mingguan dan detail hari terpilih |
| PUT | `/api/workout-program/preference` | Memilih versi latihan gym atau rumah |
| GET, POST | `/api/workout-sessions?date=YYYY-MM-DD` | Membaca/mencatat sesi |
| GET, PATCH, DELETE | `/api/workout-sessions/:id` | Membaca/mengubah/menghapus sesi |
| GET, POST | `/api/progress/weight` | Membaca/mencatat berat |
| GET | `/api/progress/summary?date=YYYY-MM-DD` | Ringkasan progres bertanggal |
| GET | `/api/dashboard?date=YYYY-MM-DD` | Ringkasan harian |
| PUT | `/api/habits/:date` | Memperbarui kebiasaan harian |
| POST, GET | `/api/chatbot/message`, `/api/chatbot/conversations` | Mengirim pesan/membaca percakapan |
| GET | `/api/chatbot/conversations/:id/messages` | Membaca pesan percakapan |

Contoh registrasi (cookie browser dikelola otomatis):

```js
fetch("/api/auth/register", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Nama",
    email: "nama@example.com",
    healthFocus: "consistency",
    password: "gunakan-password-kuat",
    confirmPassword: "gunakan-password-kuat"
  })
});
```

Respons sukses singkat:

```json
{
  "success": true,
  "data": {
    "user": { "id": 12, "name": "Nama", "email": "nama@example.com", "healthFocus": "consistency" }
  }
}
```

Respons validasi/error memakai status HTTP yang sesuai, misalnya `400`:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Alamat email tidak valid." }
}
```

## Catatan implementasi dan deployment

- Nutrisi katalog dihitung otomatis dari porsi gram dan nilai generik per 100 gram; katalog awal meliputi nasi, telur, ayam, sapi, tempe, tahu, dan pisang. Ukuran seperti 1 butir telur dikonversi ke berat porsi perkiraan. Angka katalog ditandai sebagai perkiraan karena merek, varietas, ukuran, dan cara memasak dapat mengubah nilai sebenarnya. Makanan di luar katalog tetap dapat dicatat manual dari label atau sumber tepercaya.
- BMR menggunakan persamaan Mifflin–St Jeor dan TDEE memakai faktor aktivitas; hasil hanya estimasi. Untuk kategori selain pria/wanita, aplikasi tidak menghitung BMR/TDEE.
- Chatbot memakai aturan lokal dan tidak mengklaim sebagai AI eksternal. Tidak ada kunci AI yang digunakan.
- Untuk memperbarui katalog makanan pada database yang sudah ada, jalankan `backend/sql/migrations/002_food_nutrition_catalog.sql` melalui HeidiSQL setelah memilih database `bodywise_app`. Migrasi aman dijalankan ulang; seed katalog menyediakan perkiraan umum dan porsi seperti 1 butir telur (50 g) atau 1 centong nasi (100 g).
- CSV makanan Indonesia dapat diimpor dari folder `backend` menggunakan `npm run import-foods -- "C:\\path\\database_makanan_indonesia_v2.csv"`. Pastikan migrasi `003_food_csv_catalog_fields.sql` sudah dijalankan terlebih dahulu. Kolom CSV harus sesuai format dataset Indonesia (`nama`, `kategori`, `porsi_umum`, `berat_porsi_g`, kalori/protein/lemak/karbohidrat/serat per 100 g); importer memvalidasi seluruh data, mempertahankan makanan yang sudah ada, menambahkan porsi, dan menandai nilai impor sebagai belum diverifikasi.
- Dataset latihan pemula empat minggu diimpor dari folder `backend` dengan `npm run import-workout-program -- "C:\\path\\program_latihan_pemula.json" "C:\\path\\latihan_jadwal_harian.csv" "C:\\path\\latihan_gerakan.csv" "C:\\path\\latihan_pemanasan_pendinginan.csv"`. Jalankan migrasi `004_workout_program.sql` lebih dahulu. Importer memeriksa konsistensi ID dan detail antara JSON/CSV, menyimpan jadwal Senin–Sabtu versi gym/rumah, Minggu istirahat, progres empat minggu, pemanasan, dan pendinginan; impor ulang memperbarui template tanpa menghapus sesi latihan yang dicatat pengguna. Versi awal mengikuti jadwal sumber (5 hari kekuatan, kardio ringan Sabtu, istirahat Minggu), dan akun dapat memilih gym atau rumah.
- Target kalori menggunakan estimasi TDEE dari asesmen: tujuan turun berat memakai defisit awal 300 kkal, naik berat surplus awal 200 kkal, dan maintenance memakai TDEE. Ini hanya titik awal umum, bukan rekomendasi medis/menu personal. Log asupan ditampilkan terpisah pada halaman latihan; program tidak menambah atau mengurangi latihan untuk mengompensasi makanan.
- Ide makanan menggunakan katalog dengan filter lemak maksimal 10 g per 100 g, membatasi buah ke karbohidrat total maksimal 15 g per 100 g, dan tidak menyertakan kategori minuman, camilan olahan, atau jajanan. Dataset tidak mempunyai nilai gula atau minyak tambahan terpisah; filter karbohidrat buah bukan pengukuran kadar gula, jadi periksa label produk dan cara memasak. Tiap pilihan dapat dicatat langsung dengan porsi katalog.
- Middleware memakai Helmet dengan Content Security Policy, CORS origin allowlist, pembatasan percobaan login/registrasi dan chatbot, validasi input, serta pengecekan Origin untuk permintaan browser. Kebijakan skrip dibatasi ke same-origin; inline style diizinkan untuk menjaga desain frontend saat ini. Cookie `SameSite=Lax` cocok untuk serving satu origin. Gunakan `SameSite=None` hanya dengan HTTPS dan origin frontend yang dibatasi untuk deployment lintas situs.
- Untuk deployment, database harus layanan MySQL/MariaDB yang dapat diakses backend; jangan gunakan `localhost` sebagai database produksi. Server Express biasa ini belum dikonfigurasi sebagai Vercel Function/serverless. Deployment ke Vercel memerlukan adapter/function entrypoint dan pengelolaan koneksi pool yang sesuai.
- Tautan reminder/settings tidak tersedia sebagai halaman/fungsi pada repository, sehingga fitur tersebut tidak dibuat.

## Checklist pengujian manual

1. Jalankan schema dan server; pastikan `GET /api/health` berhasil dan koneksi database valid.
2. Daftar akun baru; verifikasi cookie HttpOnly terpasang. Coba email duplikat dan password konfirmasi berbeda.
3. Login, muat dashboard, lalu logout; coba buka halaman privat tanpa sesi.
4. Simpan asesmen dan target; pastikan metrik kosong sebelum pencatatan dan target/estimasi terisi sesudahnya.
5. Cari nasi atau telur di katalog, pilih hasil, lihat perkiraan makro langsung, coba gram dan porsi (contoh: 1 butir telur), simpan catatan, lalu ubah tanggal dan hapus catatan.
6. Pilih latihan katalog, catat set/durasi, ubah tanggal, dan hapus sesi.
7. Simpan dua berat badan pada tanggal yang berbeda; verifikasi tren serta ringkasan dashboard sesuai tanggal.
8. Ubah kebiasaan, reload, dan pastikan tersimpan di server.
9. Chat dengan topik BODYWISE dan topik di luar cakupan; pastikan riwayat hanya terlihat pada akun pemilik.

Unit test backend: `cd backend; npm test`. Uji endpoint berintegrasi membutuhkan MySQL/MariaDB dan konfigurasi `.env`.
