const express = require("express");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const Event = require("../models/Event"); // Assuming you have an Event model

const router = express.Router();

// Google Sheets Authentication
const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Ensure correct key format
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

// API Route to update Google Sheets data
router.put("/update", async (req, res) => {
  const { sheetUrl, rowIndex, columnIndex, newValue } = req.body;

  if (!sheetUrl || rowIndex === undefined || columnIndex === undefined || newValue === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      return res.status(400).json({ error: "Invalid Google Sheet URL" });
    }

    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    await sheet.loadCells(); // Load all cells in the sheet

    // Get the cell to update (1-based indexing for rows and columns)
    const cell = sheet.getCell(rowIndex, columnIndex);
    cell.value = newValue; // Update the cell value

    await sheet.saveUpdatedCells(); // Save the updated cells

    res.json({ success: true, message: "Cell updated successfully" });
  } catch (error) {
    console.error("Error updating Google Sheets:", error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Save Google Sheet information to the event
router.post("/:eventId/save-sheet", async (req, res) => {
  const { eventId } = req.params;
  const { sheetUrl, sheetTitle } = req.body;

  if (!sheetUrl || !sheetTitle) {
    return res.status(400).json({ success: false, error: "Sheet URL and title are required" });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }

    // Append the new Google Sheet to the array
    event.googleSheets.push({ url: sheetUrl, title: sheetTitle });
    await event.save();

    res.json({ success: true, message: "Google Sheet information saved" });
  } catch (error) {
    console.error("Error saving Google Sheet information:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Fetch Google Sheet information for the event
router.get("/:eventId/sheet-info", async (req, res) => {
  const { eventId } = req.params;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }

    res.json({ success: true, googleSheets: event.googleSheets });
  } catch (error) {
    console.error("Error fetching Google Sheet information:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Delete a Google Sheet from the event
router.delete("/:eventId/delete-sheet", async (req, res) => {
  const { eventId } = req.params;
  const { sheetUrl } = req.body;

  if (!sheetUrl) {
    return res.status(400).json({ success: false, error: "Sheet URL is required" });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }

    // Remove the sheet from the array
    event.googleSheets = event.googleSheets.filter((sheet) => sheet.url !== sheetUrl);
    await event.save();

    res.json({ success: true, message: "Google Sheet deleted successfully" });
  } catch (error) {
    console.error("Error deleting Google Sheet:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});



//nodemailer
const nodemailer = require("nodemailer");


// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASSWORD, // Your email password or app password
  },
});

// API Route to send feedback emails
router.post("/send-feedback-emails", async (req, res) => {
  const { emails, subject, message } = req.body;

  // Validate input
  if (!emails || !Array.isArray(emails)) { // Fixed: Added missing parenthesis
    return res.status(400).json({ success: false, error: "Emails must be an array" });
  }
  if (!subject || !message) {
    return res.status(400).json({ success: false, error: "Subject and message are required" });
  }

  try {
    // Send emails to all recipients
    const emailPromises = emails.map((email) => {
      return transporter
        .sendMail({
          from: process.env.EMAIL_USER, // Sender email
          to: email, // Recipient email
          subject: subject, // Email subject
          text: message, // Plain text email message
          // html: "<p>Your HTML content here</p>", // Uncomment for HTML emails
        })
        .then((info) => {
          console.log(`Email sent to ${email}:`, info.messageId);
          return { email, success: true, messageId: info.messageId };
        })
        .catch((error) => {
          console.error(`Failed to send email to ${email}:`, error);
          return { email, success: false, error: error.message };
        });
    });

    // Wait for all emails to be sent
    const results = await Promise.all(emailPromises);

    // Check if any emails failed to send
    const failedEmails = results.filter((result) => !result.success);
    if (failedEmails.length > 0) {
      return res.status(500).json({
        success: false,
        error: "Some emails failed to send",
        failedEmails,
      });
    }

    // All emails sent successfully
    res.json({ success: true, message: "Emails sent successfully!" });
  } catch (error) {
    console.error("Error sending emails:", error);
    res.status(500).json({ success: false, error: "Failed to send emails" });
  }
});


module.exports = router;
