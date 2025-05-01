const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const SPREADSHEET_ID = '154_bycpQeugA5UJDXvaoE9F1klESUxj-mQOBPxgoFjU';
const SHEET_NAME = 'Detail'; // Nama sheet yang digunakan

// Ambil isi credentials dari environment variable
const rawCredentials = process.env.GOOGLE_CREDENTIALS;
const credentials = JSON.parse(rawCredentials);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

app.post('/webhook', async (req, res) => {
  const message = req.body.Body || '';
  const sender = req.body.From;
  console.log(`Pesan masuk dari ${sender}: ${message}`);

  if (!message.startsWith('STATUS:')) {
    res.set('Content-Type', 'text/xml');
    return res.send(`
      <Response>
        <Message>Format salah. Gunakan: STATUS:&lt;ID_TIKET&gt; atau STATUS:OPEN</Message>
      </Response>`);
  }

  const tiketID = message.split(':')[1].trim().toUpperCase();

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:K1000`,
    });

    const rows = result.data.values;
    res.set('Content-Type', 'text/xml');

    if (!rows || rows.length === 0) {
      return res.send(`<Response><Message>Data sheet kosong.</Message></Response>`);
    }

    if (tiketID === 'OPEN') {
      const openTickets = rows.filter(row => row[8]?.toLowerCase() === 'open');

      if (openTickets.length === 0) {
        return res.send(`<Response><Message>Tidak ada tiket yang berstatus OPEN.</Message></Response>`);
      }

      const list = openTickets.slice(0, 5).map(row => {
        return `- ${row[1]} | ${row[3]} | KP ${row[10] || '-'}`;
      }).join('\n');

      return res.send(`<Response><Message>Berikut 5 tiket OPEN:\n${list}</Message></Response>`);
    }

    const data = rows.find(row => row[1]?.toUpperCase() === tiketID);

    if (data) {
      const [, idTiket, sid, deskripsi, namaTim, tglTiket, tglClose, jenisAktifitas, manHours, status, kp] = data;

      return res.send(`<Response><Message>
Tiket: ${idTiket}
SID: ${sid}
Deskripsi: ${deskripsi}
Nama Tim: ${namaTim}
Tanggal Tiket: ${tglTiket}
Tanggal Close: ${tglClose}
Jenis Aktivitas: ${jenisAktifitas}
Durasi: ${manHours} jam
Status: ${status}
KP: ${kp}
      </Message></Response>`);
    } else {
      return res.send(`<Response><Message>Tiket ${tiketID} tidak ditemukan.</Message></Response>`);
    }
  } catch (err) {
    console.error('Gagal ambil data dari Spreadsheet:', err.message);
    res.set('Content-Type', 'text/xml');
    res.status(500).send(`<Response><Message>Terjadi kesalahan saat mengambil data.</Message></Response>`);
  }
});

app.listen(3000, () => {
  console.log('✅ Bot aktif di http://localhost:3000');
});
