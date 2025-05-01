const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const SPREADSHEET_ID = '154_bycpQeugA5UJDXvaoE9F1klESUxj-mQOBPxgoFjU';
const SHEET_NAME = 'Detail';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

let lastSender = null;
let currentPage = 0;
const pageSize = 10;

app.post('/webhook', async (req, res) => {
  const message = (req.body.Body || '').trim();
  const sender = req.body.From;
  console.log(`Pesan masuk dari ${sender}: ${message}`);

  res.set('Content-Type', 'text/xml');

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:K1000`,
    });

    const rows = result.data.values;
    if (!rows || rows.length === 0) {
      return res.send(`<Response><Message>Sheet kosong.</Message></Response>`);
    }

    // STATUS:OPEN
    if (message.toUpperCase() === 'STATUS:OPEN') {
      const openTickets = rows.filter(row => row[8]?.toLowerCase() === 'open');
      if (openTickets.length === 0) {
        return res.send(`<Response><Message>Tidak ada tiket OPEN.</Message></Response>`);
      }

      lastSender = sender;
      currentPage = 0;

      const page = openTickets.slice(0, pageSize).map(row => `- ${row[1]} | ${row[3]} | KP ${row[10] || '-'}`).join('\n');
      return res.send(`<Response><Message>Berikut tiket OPEN:\n${page}\n\nKetik NEXT untuk lanjut.</Message></Response>`);
    }

    // STATUS:CLOSED
    if (message.toUpperCase() === 'STATUS:CLOSED') {
      const closedTickets = rows.filter(row => row[8]?.toLowerCase() === 'closed');
      if (closedTickets.length === 0) {
        return res.send(`<Response><Message>Tidak ada tiket CLOSED.</Message></Response>`);
      }

      lastSender = sender;
      currentPage = 0;

      const page = closedTickets.slice(0, pageSize).map(row => `- ${row[1]} | ${row[3]} | KP ${row[10] || '-'}`).join('\n');
      return res.send(`<Response><Message>Berikut tiket CLOSED:\n${page}\n\nKetik NEXT untuk lanjut.</Message></Response>`);
    }

    // STATUS:ALL
    if (message.toUpperCase() === 'STATUS:ALL') {
      lastSender = sender;
      currentPage = 0;

      const page = rows.slice(0, pageSize).map(row => `- ${row[1]} | ${row[3]} | Status: ${row[8]} | KP ${row[10] || '-'}`).join('\n');
      return res.send(`<Response><Message>Berikut semua tiket:\n${page}\n\nKetik NEXT untuk lanjut.</Message></Response>`);
    }

    // NEXT
    if (message.toUpperCase() === 'NEXT') {
      if (sender !== lastSender) {
        return res.send(`<Response><Message>Silakan mulai dengan STATUS:OPEN atau STATUS:CLOSED dulu.</Message></Response>`);
      }

      currentPage++;
      const start = currentPage * pageSize;
      const end = start + pageSize;
      const page = rows.slice(start, end);

      if (page.length === 0) {
        return res.send(`<Response><Message>Tidak ada data lagi.</Message></Response>`);
      }

      const formatted = page.map(row => `- ${row[1]} | ${row[3]} | Status: ${row[8]} | KP ${row[10] || '-'}`).join('\n');
      return res.send(`<Response><Message>Halaman ${currentPage + 1}:\n${formatted}\n\nKetik NEXT lagi untuk lanjut.</Message></Response>`);
    }

    // STATUS:<ID>
    if (message.toUpperCase().startsWith('STATUS:')) {
      const tiketID = message.split(':')[1].trim().toUpperCase();
      const row = rows.find(r => r[1]?.toUpperCase() === tiketID);

      if (!row) {
        return res.send(`<Response><Message>Tiket ${tiketID} tidak ditemukan.</Message></Response>`);
      }

      const [ , idTiket, sid, deskripsi, namaTim, tglTiket, tglClose, jenisAktifitas, manHours, status, kp] = row;
      return res.send(`<Response><Message>
Tiket: ${idTiket}
SID: ${sid}
Deskripsi: ${deskripsi}
Tim: ${namaTim}
Tgl Tiket: ${tglTiket}
Tgl Close: ${tglClose}
Aktivitas: ${jenisAktifitas}
Durasi: ${manHours} jam
Status: ${status}
KP: ${kp}
      </Message></Response>`);
    }

    return res.send(`<Response><Message>Format tidak dikenali. Gunakan STATUS:OPEN, STATUS:CLOSED, STATUS:ALL, atau STATUS:<ID>.</Message></Response>`);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    return res.status(500).send(`<Response><Message>Terjadi kesalahan saat mengambil data.</Message></Response>`);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('✅ Bot aktif di http://localhost:3000');
});
