# PROMPT UNTUK GEMINI 3.1 PRO (holver-lead) — BANGUN INTERNAL TOOL

## SUMBER KEBENARAN

Baca dan ikuti persis `PRD-internal-tool.md` di root repo. Ini scope BARU, terpisah dari pekerjaan pilot site (landing/checklist/qualification) yang sudah ada — jangan campur atau timpa file pilot site yang sudah final (`01-landing-page.md`, `02-evidence-checklist-and-sample-report.md`, `03-qualification-form.md`). File-file itu tetap jadi rujukan konten kanonik (checklist 12 item, sample report 6/2/3/1) — salin persis, jangan diubah.

## YANG DIBANGUN (urutan prioritas)

1. **Modul A — CLI Evidence Collector**: script standalone (Node.js atau Python, pilih paling ringan didistribusikan) yang customer jalankan lokal. Fungsi: fresh install+build dengan capture exit code, scan nama environment variable (bukan nilai), form interaktif ownership matrix, output `evidence.json` terstruktur sesuai 12 item checklist kanonik.
2. **Modul B — Report Generator**: form review lokal untuk Martua input status manual per item + catatan, hitung ringkasan otomatis (jumlah SUPPORTED/ATTESTED/NOT SUPPORTED/NOT ASSESSED — WAJIB dihitung dari data aktual, tidak boleh salah hitung), generate output HTML/PDF final sesuai format laporan kanonik (termasuk disclaimer scope dan bahasa "documented vs execution-tested").
3. **Modul C — Domain/DNS Auto-Checker**: query WHOIS/RDAP publik dan DNS record untuk domain yang diberikan (data non-sensitif, tanpa credential apa pun). Tampilkan hasil sebagai supporting signal, BUKAN keputusan otomatis. Kalau WHOIS privacy-protected, laporkan itu apa adanya, jangan menebak kesimpulan.

## ATURAN KERAS (jangan dilanggar)

- Tidak ada AI yang menentukan status SUPPORTED/ATTESTED/NOT SUPPORTED/NOT ASSESSED untuk item apa pun — itu selalu keputusan manual Martua lewat Modul B.
- Tidak ada akun/login/dashboard customer.
- Tidak ada integrasi payment API — checkout tetap link statis Lemon Squeezy/Polar, tidak disentuh.
- Tidak ada database multi-tenant atau server publik permanen untuk Modul B dan C — keduanya cukup berjalan lokal di mesin/VPS Martua.
- Modul A tidak boleh mengirim data apa pun secara otomatis ke mana pun — hanya menghasilkan file lokal yang customer kirim sendiri secara manual.
- Jangan ubah checklist 12 item atau distribusi 6/2/3/1 di sample report manapun — itu sudah final.
- Jangan publish/deploy ke production.

## DEFINITION OF DONE

Ikuti persis bagian 6 (Definition of Done) di `PRD-internal-tool.md`. Begitu tiga modul lolos definition of done itu, pekerjaan selesai — jangan lanjut audit/polish tambahan tanpa temuan bug konkret.

## LAPORAN AKHIR

Setelah selesai, laporkan: modul mana yang berfungsi, hasil test end-to-end (evidence.json contoh → review → report keluar), hasil test Modul C untuk minimal 2 domain berbeda (satu yang WHOIS terbuka, satu yang privacy-protected, untuk membuktikan penanganan kedua kasus jujur), dan file/path yang dihasilkan.
