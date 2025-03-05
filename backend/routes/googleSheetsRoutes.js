const express = require("express");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

const router = express.Router();

// Google Sheets Authentication
const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

// Helper function to extract Google Sheet ID from URL
const extractSheetId = (url) => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
};

// API Route to fetch Google Sheets data based on URL
router.post("/fetch", async (req, res) => {
  console.log("Received request body:", req.body);

  try {
      const { sheetUrl } = req.body;
      if (!sheetUrl) {
          console.error("Missing Sheet URL");
          return res.status(400).json({ error: "Sheet URL is required" });
      }

      const sheetId = extractSheetId(sheetUrl);
      if (!sheetId) {
          console.error("Invalid Google Sheet URL");
          return res.status(400).json({ error: "Invalid Google Sheet URL" });
      }

      console.log("Extracted Sheet ID:", sheetId);

      const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
      await doc.loadInfo();

      console.log("Connected to Google Sheet:", doc.title);

      const sheet = doc.sheetsByIndex[0];
      const rows = await sheet.getRows();

      console.log("Fetched rows:", rows.length);

      if (rows.length > 0) {
          // Extract headers from the first row (assuming first row contains headers)
          const headers = sheet.headerValues;
          console.log("Sheet Headers:", headers);  // Log the headers

          // Map data rows to match headers
          const data = rows.map((row, rowIndex) => {
            console.log(`Raw Data for Row ${rowIndex}:`, row._rawData);  // Log raw data for each row
            let rowData = {};
            headers.forEach((header, index) => {
                rowData[header] = row._rawData[index] || '';  // Access raw data if row[header] is not available
            });
            return rowData;
        });
        
        

          // Send headers and data to the frontend
          res.json({ sheetTitle: doc.title, headers: headers, data: data });
      } else {
          return res.status(404).json({ error: "No data found in sheet." });
      }

  } catch (error) {
      console.error("Error accessing Google Sheets:", error.message, error.stack);
      res.status(500).json({ error: error.message });
  }
});


module.exports = router;
