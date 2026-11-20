# Happy Point KKB: panduan pasang (sekali saja)

Web ini punya dua alamat:
- `/` = form pelanggan (ini yang di-QR)
- `/admin` = halaman admin (login)

## 1. Database dan penyimpanan foto (Supabase)
1. Buka supabase.com, buat project baru (atau pakai project yang sudah ada).
2. Menu **SQL Editor** > New query > paste seluruh isi file `supabase.sql` > **Run**. Ini membuat semua tabel dan bucket foto privat "faktur".
3. Menu **Project Settings > API**, catat dua hal:
   - **Project URL** (contoh `https://abcd.supabase.co`)
   - **service_role key** (rahasia, jangan dibagikan atau ditaruh di kode)

## 2. Email notifikasi (Gmail)
1. Akun Google yang dipakai sebagai pengirim harus aktif **Verifikasi 2 Langkah**.
2. Buka myaccount.google.com/apppasswords, buat App Password (nama bebas, misal "Happy Point"), catat 16 karakternya.
3. Penerima notifikasi tidak ditulis di sini. Diatur nanti di halaman admin > Pengaturan.

## 3. GitHub dan Vercel
1. Buat repo baru di GitHub, upload semua isi folder ini (file `package.json` harus ada di root repo, bukan di dalam subfolder).
2. Vercel > Add New Project > pilih repo itu. Framework otomatis terdeteksi Vite.
3. Sebelum Deploy, isi **Environment Variables**:

| Nama | Isi |
|---|---|
| `SUPABASE_URL` | Project URL dari langkah 1 |
| `SUPABASE_SERVICE_KEY` | service_role key dari langkah 1 |
| `SESSION_SECRET` | teks acak panjang apa saja (minimal 32 karakter) |
| `ADMIN_USER` | username pemilik, contoh `rincha` |
| `ADMIN_PASS` | password pemilik (minimal 6 karakter) |
| `ADMIN_NAME` | nama tampilan pemilik, contoh `Rincha` |
| `SMTP_USER` | alamat Gmail pengirim |
| `SMTP_PASS` | App Password 16 karakter dari langkah 2 |
| `APP_URL` | alamat web ini, contoh `https://happy-point-kkb.vercel.app` (isi setelah tahu alamatnya, lalu Redeploy) |

4. Klik Deploy.

## 4. Pertama kali dipakai
1. Buka `alamat-web/admin`, login dengan `ADMIN_USER` dan `ADMIN_PASS`. Login pertama otomatis membuat akun pemilik.
2. Menu **Pengaturan**: tambah email penerima notifikasi, tambah akun admin lain (tiap orang punya username dan password sendiri), ganti password kalau perlu.
3. Buat QR code dari alamat utama web (`alamat-web/`), cetak, tempel di KKB.
4. Tes: kirim satu faktur dari HP, cek email masuk, cek di antrean admin.

## Cara kerja poin
- Admin memeriksa foto faktur, mengisi **total belanja produk Garudafood dan Dilan** dan mencentang **ada Kacang Atom/Kulit 1000 min 1 Ball**.
- Rp100.000 = 1 poin. Sisa di bawah Rp100.000 kebawa ke faktur berikutnya pelanggan yang sama (dikenali dari nomor HP). Poin tidak hangus.
- Faktur tanpa kacang = 0 poin, belanjanya tidak dihitung dan tidak kebawa.
- Penukaran hadiah dicatat dan mengurangi saldo (Pelanggan & saldo > Tukar).
- **Export Excel** (Pelanggan & saldo) berisi 3 sheet: Faktur, Rekap Poin, Penukaran.

## Catatan
- Foto faktur disimpan privat, hanya tampil di halaman admin lewat link sementara (15 menit).
- Foto diperkecil otomatis di HP pelanggan sebelum dikirim.
- Kalau email gagal terkirim, faktur tetap tersimpan dan tampil di antrean admin.
- Logo Garudafood belum dipasang. Taruh file logonya di folder `public/` lalu minta dipasang.
