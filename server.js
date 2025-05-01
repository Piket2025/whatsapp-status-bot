const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const SPREADSHEET_ID = '154_bycpQeugA5UJDXvaoE9F1klESUxj-mQOBPxgoFjU';
const SHEET_NAME = 'Detail';

const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const session = {}; // Menyimpan sesi paging per nomor

app.post('/webhook', async (req, res) => {
  const message = req.body.Body || '';
  const sender = req.body.From;
  const text = message.trim().toUpperCase();

  console.log(`📩 Pesan dari ${sender}: ${text}`);

  if (text === 'NEXT' || text === 'PREV') {
    if (!session[sender]) {
      return res.send(`<Response><Message>Belum ada sesi aktif. Kirim STATUS:OPEN / CLOSED / ALL dulu.</Message></Response>`);
    }

    const { status, page } = session[sender];
    const newPage = text === 'NEXT' ? page + 1 : Math.max(1, page - 1);
    return handlePagedStatus(res, status, newPage, sender);
  }

  if (!text.startsWith('STATUS:')) {
    return res.send(`<Response><Message>Gunakan: STATUS:OPEN / CLOSED / ALL / <ID_TIKET></Message></Response>`);
  }

  const args = text.split(':')[1].trim();
  const [statusParamRaw, pageParamRaw] = args.split('PAGE').map(s => s.trim());
  const statusParam = statusParamRaw;
  const page = parseInt(pageParamRaw) || 1;

  session[sender] = { status: statusParam, page };

  if (['OPEN', 'CLOSED', 'ALL'].includes(statusParam)) {
    return handlePagedStatus(res, statusParam, page, sender);
  }

  // ========== Cari berdasarkan ID Tiket ==========
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:K1000`,
    });

    const rows = result.data.values || [];
    const tiket = rows.find(row => row[1]?.trim().toUpperCase() === statusParam);

    if (tiket) {
      const [no, idTiket, sid, deskripsi, namaTim, tglTiket, tglClose, jenisAktifitas, manHours, status, kp] = tiket;

      return res.send(`
        <Response>
          <Message>
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
          </Message>
        </Response>
      `);
    } else {
      return res.send(`<Response><Message>Tiket ${statusParam} tidak ditemukan.</Message></Response>`);
    }

  } catch (err) {
    console.error('❌ Error saat ambil detail tiket:', err);
    res.set('Content-Type', 'text/xml');
    return res.status(500).send(`<Response><Message>Gagal ambil data.</Message></Response>`);
  }
});

// ========== Fungsi Paging Tiket OPEN/CLOSED/ALL ==========
async function handlePagedStatus(res, statusParam, page, sender) {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:K1000`,
    });

    const rows = result.data.values || [];

    let filtered = rows;
    if (statusParam === 'OPEN') {
      filtered = rows.filter(r => r[9]?.toLowerCase().trim() === 'open');
    } else if (statusParam === 'CLOSED') {
      filtered = rows.filter(r => r[9]?.toLowerCase().trim() === 'closed');
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (page - 1) * itemsPerPage;
    const sliced = filtered.slice(start, start + itemsPerPage);

    if (sliced.length === 0) {
      return res.send(`<Response><Message>Halaman ${page} kosong. Ketik PREV untuk kembali.</Message></Response>`);
    }

    session[sender] = { status: statusParam, page };

    const list = sliced.map(row =>
      `- ${row[1]} | ${row[3]} | Status: ${row[9] || '-'} | KP: ${row[10] || '-'}`
    ).join('\n');

    return res.send(`
      <Response>
        <Message>
Daftar tiket ${statusParam} - Hal ${page}/${totalPages}:
${list}

Ketik NEXT atau PREV untuk navigasi halaman.
        </Message>
      </Response>
    `);
  } catch (err) {
    console.error('❌ Error di handlePagedStatus:', err);
    res.set('Content-Type', 'text/xml');
    return res.status(500).send(`<Response><Message>Gagal mengambil data.</Message></Response>`);
  }
}

app.listen(3000, () => {
  console.log('✅ Bot aktif di http://localhost:3000');
});
