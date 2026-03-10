import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const SPREADSHEET_ID = '1qAP_fW4f539wr4uP9sDdH7wtPwHiavk67SpMIHoLKWs';

// Ensure you have google-service-account.json in the same directory as this file
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'google-service-account.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

app.get('/api/metrics', async (req, res) => {
  try {
    const range = 'Tickets!A1:Z'; // Adjust sheet name if needed
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No data found.' });
    }

    // Convert rows to an array of objects
    const headers = rows[0];
    const data = rows.slice(1).map((row) => {
      let rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index] || '';
      });
      return rowData;
    });

    res.json({ data });
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
