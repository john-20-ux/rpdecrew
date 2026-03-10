const STORAGE_KEY = "rpdecrew_settings_state";

export const fetchEmployeeMetrics = async () => {
  try {
    // 1. Get the configured spreadsheet ID and Tab Name from localStorage (saved via Settings page)
    const savedState = localStorage.getItem(STORAGE_KEY);
    const token = sessionStorage.getItem("gapi_access_token");

    if (!savedState || !token) {
      console.warn("Google Sheets not configured or token missing. Please connect via Settings.");
      return [];
    }

    const { sheetUrl, selectedTab } = JSON.parse(savedState);
    if (!sheetUrl || !selectedTab) {
      console.warn("Spreadsheet URL or Tab not selected in Settings.");
      return [];
    }

    // Extract the Spreadsheet ID from the URL
    // URL format: https://docs.google.com/spreadsheets/d/1qAP_fW4f539wr4uP9sDdH7wtPwHiavk67SpMIHoLKWs/edit
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || match.length < 2) {
      console.error("Invalid Google Sheet URL format in Settings.");
      return [];
    }
    const spreadsheetId = match[1];

    // 2. Fetch directly from Google Sheets API using the OAuth token and the selected Tab
    const range = `${selectedTab}!A1:Z`;
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.error("Google OAuth token expired or invalid.");
        sessionStorage.removeItem("gapi_access_token"); // Force re-login
      }
      throw new Error(`Google Sheets API error! status: ${response.status}`);
    }

    const result = await response.json();
    const rows = result.values;

    if (!rows || rows.length === 0) {
      return [];
    }

    // 3. Convert rows to an array of objects
    const headers = rows[0];
    const data = rows.slice(1).map((row: any[]) => {
      let rowData: Record<string, string> = {};
      headers.forEach((header: string, index: number) => {
        rowData[header] = row[index] || '';
      });
      return rowData;
    });

    return data;
  } catch (error) {
    console.error('Failed to fetch employee metrics:', error);
    return [];
  }
};