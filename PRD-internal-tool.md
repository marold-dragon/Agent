# PRD — Handoff Evidence Internal Tool (v1)

## 1. Ringkasan

Tool internal untuk Martua (bukan produk customer-facing, bukan SaaS multi-tenant). Tujuannya: mengurangi waktu manual per audit Handoff Evidence Report, dan menambah satu sumber evidence yang independen (bukan self-attestation) untuk item domain/DNS. Keputusan status tiap item (SUPPORTED/ATTESTED/NOT SUPPORTED/NOT ASSESSED) **tetap ditentukan manual oleh Martua** — tool ini tidak pernah memberi verdict otomatis.

## 2. Non-goals (eksplisit tidak dikerjakan di v1 ini)

- Tidak ada akun/login customer
- Tidak ada dashboard customer
- Tidak ada integrasi payment API (checkout tetap link statis Lemon Squeezy/Polar seperti sekarang)
- Tidak ada database multi-tenant
- Tidak ada AI yang menentukan status/verdict item apa pun
- Tidak ada subscription/billing engine
- Tidak perlu publicly-facing server permanen — boleh berjalan lokal di komputer/VPS Martua saja

## 3. Pengguna

Satu-satunya pengguna aktif tool ini adalah Martua sendiri. Customer hanya berinteraksi dengan satu bagian: CLI evidence collector (lihat Modul A).

## 4. Modul (urutan prioritas build)

### Modul A — CLI Evidence Collector (dijalankan customer)

Script kecil (Node.js atau Python, pilih yang paling ringan untuk didistribusikan sebagai single file/binary) yang customer download dan jalankan secara lokal di project mereka.

Fungsi:
- Menjalankan fresh install + build project (`npm install`/`pnpm install`, lalu build command yang dikonfirmasi user), menangkap exit code dan output non-sensitif.
- Meng-scan file konfigurasi umum (`.env.example`, `package.json`, dsb) untuk mengekstrak **nama** environment variable yang direferensikan — bukan nilainya. (Tetap tidak melanggar prinsip "no source code cross-check" karena tool berjalan di mesin customer, hasilnya cuma daftar nama, bukan isi source yang dikirim ke Martua.)
- Menyajikan form interaktif sederhana di terminal untuk ownership matrix (repo/domain/hosting/database/other services — siapa pemiliknya) dan known manual dependencies — customer isi manual.
- Output: satu file `evidence.json` terstruktur, berisi semua hasil di atas dalam format yang sudah dipetakan ke 12 item checklist kanonik.
- **Tidak pernah** mengirim apa pun otomatis — customer yang memutuskan mengirim `evidence.json` ke Martua (attachment atau shared folder, sesuai dua opsi retensi yang sudah ada).

### Modul B — Report Generator (dijalankan Martua, lokal)

Input: `evidence.json` dari customer + input manual Martua (status final per item dari 4 pilihan, catatan evidence, rekomendasi).

Fungsi:
- Render form review: tiap item ditampilkan dengan evidence mentah dari `evidence.json`, Martua pilih status + isi catatan.
- Hitung otomatis ringkasan (jumlah SUPPORTED/ATTESTED/NOT SUPPORTED/NOT ASSESSED dari 12 item) — **ini yang mencegah kesalahan aritmatika manual yang pernah terjadi sebelumnya (4/8 vs 5/9).**
- Generate output final sebagai HTML/PDF mengikuti format laporan kanonik yang sudah distandarkan (termasuk disclaimer scope, "documented vs execution-tested" language, dan rekomendasi sebelum handoff).

### Modul C — Domain/DNS Auto-Checker (dijalankan Martua, opsional per audit)

Input: nama domain (data non-sensitif, customer sudah kasih tahu di ownership matrix).

Fungsi:
- Query publik WHOIS/RDAP (contoh: rdap.org atau RDAP endpoint registrar terkait) dan DNS record (nameserver, A/CNAME record) — semua data publik, tidak butuh credential apa pun dari siapa pun.
- Tampilkan hasil sebagai **sinyal pendukung**, bukan keputusan otomatis: contoh, "Nameserver mengarah ke Cloudflare account X" atau "Registrar tercatat sebagai Y" — Martua yang menilai apakah ini konsisten dengan klaim ownership customer.
- **Penting:** hasil dari modul ini tidak pernah otomatis mengubah status jadi SUPPORTED. Ia hanya menambah evidence yang independen untuk membantu keputusan manual Martua. Kalau WHOIS ter-privacy-protect (umum terjadi), modul ini melaporkan "tidak bisa disimpulkan dari data publik" — bukan dipaksakan jadi kesimpulan.

## 5. Alur kerja end-to-end (setelah tool ini ada)

1. Customer bayar via Lemon Squeezy/Polar (link statis, tidak berubah).
2. Customer download & jalankan CLI Evidence Collector → hasil `evidence.json`.
3. Customer kirim `evidence.json` ke Martua (attachment/shared folder, sesuai kebijakan retensi yang sudah ada).
4. Martua jalankan Domain/DNS Auto-Checker untuk domain yang relevan (opsional, tapi disarankan tiap audit).
5. Martua buka Report Generator, isi status final tiap item dengan bantuan evidence dari langkah 2 dan 4.
6. Report Generator keluarkan HTML/PDF final.
7. Martua kirim laporan ke customer secara manual (email, dsb — belum ada pengiriman otomatis di v1).

## 6. Definition of Done (v1)

- Modul A: CLI berjalan di Node.js/Python standar, menghasilkan `evidence.json` valid yang mencakup 12 item checklist kanonik, tidak mengirim data apa pun tanpa aksi eksplisit dari customer.
- Modul B: Form review lokal berfungsi, menghasilkan HTML/PDF dengan ringkasan hitungan otomatis yang selalu match dengan jumlah status yang dipilih (tidak ada kemungkinan salah hitung manual).
- Modul C: Bisa query WHOIS/DNS publik untuk domain apa pun, menampilkan hasil mentah + catatan "supporting signal, not a verdict", menangani kasus privacy-protected WHOIS dengan jujur (bukan tebakan).
- Tidak ada modul yang mengirim data ke server pihak ketiga selain query WHOIS/DNS publik itu sendiri.
- Semua berjalan lokal — tidak butuh deployment publik untuk Modul B dan C. Modul A cukup didistribusikan sebagai file yang bisa didownload dari halaman pilot yang sudah ada.

## 7. Referensi konten kanonik (jangan diubah)

Checklist 12 item, 4 kategori, dan definisi status SUPPORTED/ATTESTED/NOT SUPPORTED/NOT ASSESSED: lihat `02-evidence-checklist-and-sample-report.md`. Sample report Acme Bookings (12 item, 6/2/3/1) di file yang sama adalah acuan format output Modul B.
