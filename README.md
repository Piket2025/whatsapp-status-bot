# WhatsApp Ticket Status Bot (Google Sheets)

Bot ini memungkinkan pengguna WhatsApp mengirim pesan seperti `STATUS:OPEN` atau `STATUS:<ID>` untuk mengecek status tiket dari Google Sheets.

## 🚀 Fitur
- Cek status tiket berdasarkan ID
- Lihat daftar tiket OPEN / CLOSED / ALL
- Navigasi dengan NEXT / PREV
- Paging otomatis (10 tiket per halaman)

## 🧱 Struktur Proyek
- `server.js` — Kode utama bot
- `credentials.json` — Kunci akses ke Google Sheets

## 🛠️ Cara Deploy di Railway
1. Buat akun di https://railway.app
2. Klik "New Project" → "Deploy from GitHub"
3. Upload file ini ke GitHub (dengan isi file `server.js` & `credentials.json`)
4. Railway akan otomatis menjalankan server
5. Ambil URL publik Railway, misalnya: `https://mybot.up.railway.app`

## 🔗 Hubungkan ke Twilio WhatsApp Sandbox
1. Masuk ke Twilio Console > Messaging > WhatsApp Sandbox
2. Masukkan URL webhook:
   ```
   https://mybot.up.railway.app/webhook
   ```
3. Join sandbox dari HP kamu, lalu coba kirim:
   - `STATUS:OPEN`
   - `NEXT`
   - `STATUS:<ID_TIKET>`

## 📝 Contoh Pesan WhatsApp
```
STATUS:OPEN
NEXT
STATUS:RWEMNCFP
```

## 🔒 Catatan
- Jangan sebar `credentials.json` ke publik
- Kamu bisa batasi nomor WhatsApp yang boleh akses lewat `req.body.From`