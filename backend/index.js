const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");  // Only declare cors once
const helmet = require("helmet");  // Import helmet for security
const authRoutes = require("./routes/auth");
const documentRoutes = require("./routes/documents");
const departmentRoutes = require("./routes/department");
const files = require("./routes/files");
const meetingRoutes = require("./routes/meeting");
const session = require('express-session');
const MongoStore = require("connect-mongo");
const communityRoutes = require("./routes/community");
const eventRoutes = require("./routes/events"); // Import event routes
// const googleAuth = require('./routes/googleAuth'); // Import Google OAuth routes
const googleSheetsRoutes = require('./routes/googleSheetsRoutes'); // Import Google Sheets routes

dotenv.config();

const app = express();
const path = require("path");


// Other middlewares like session, json parsing, and helmet
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL,  // Ensure you're using a persistent session store
  }),
  cookie: { secure: false, httpOnly: true },  // secure: true for HTTPS
}));

app.use(express.json());
// app.use(cors({
//   origin: "http://localhost:3000",  // Allow requests from your frontend
//   credentials: true,  // Allow session cookies
// }));
const corsOptions = {
  origin: "http://localhost:3000", // Allow frontend to communicate
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow session cookies
};

app.use(cors(corsOptions));

// Middleware for Content Security Policy (CSP)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", 
          "'unsafe-eval'",
          "https://apis.google.com",  // Allow Google APIs
          "https://accounts.google.com",
        ],
        frameSrc: [
          "https://accounts.google.com",
          "https://www.googleapis.com",
        ], 
        connectSrc: [
          "'self'",
          "https://www.googleapis.com",
          "https://oauth2.googleapis.com",
        ], 
      },
    },
  })
);

// Middleware to serve static files (uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database connection
mongoose
  .connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("DB connected"))
  .catch((err) => console.error("DB not connected:", err));

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
  });

  

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/file", files);
app.use("/api/meeting", meetingRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/events", eventRoutes); // API route for events
// app.use("/api/google", googleAuth); // API route for Google OAuth
app.use("/api/google-sheets", googleSheetsRoutes); // API route for Google Sheets
// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));





// const express = require("express");
// const mongoose = require("mongoose");
// const dotenv = require("dotenv");
// const cors = require("cors");
// const helmet = require("helmet");
// const authRoutes = require("./routes/auth");
// const documentRoutes = require("./routes/documents");
// const departmentRoutes = require("./routes/department");
// const files = require("./routes/files");
// const meetingRoutes = require("./routes/meeting");
// const session = require("express-session");
// const MongoStore = require("connect-mongo");
// const communityRoutes = require("./routes/community");
// const eventRoutes = require("./routes/events");
// const googleAuth = require('./routes/googleAuth');

// const path = require("path");
// const { google } = require('googleapis');
// const fs = require('fs');

// // Load service account credentials
// const credentials = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'secret-key.json')));
// const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
// const googleSheetsRoutes = require('./routes/googleSheetsRoutes');

// const auth = new google.auth.GoogleAuth({
//   credentials,
//   scopes,
// });

// const sheets = google.sheets({ version: 'v4', auth });

// // Function to get data from Google Sheets
// const getSheetData = async (spreadsheetId, range) => {
//   try {
//     const response = await sheets.spreadsheets.values.get({
//       spreadsheetId,
//       range,
//     });
//     return response.data.values; // Return the rows of the sheet
//   } catch (error) {
//     console.error('Error reading Google Sheet:', error);
//     throw new Error('Error reading data from Google Sheet');
//   }
// };

// // Function to update data in Google Sheets
// const updateSheetData = async (spreadsheetId, range, values) => {
//   try {
//     const response = await sheets.spreadsheets.values.update({
//       spreadsheetId,
//       range,
//       valueInputOption: 'RAW',
//       resource: {
//         values,
//       },
//     });
//     return response.data;
//   } catch (error) {
//     console.error('Error updating Google Sheet:', error);
//     throw new Error('Error updating data in Google Sheet');
//   }
// };

// // Function to append data to Google Sheets
// const appendSheetData = async (spreadsheetId, range, values) => {
//   try {
//     const response = await sheets.spreadsheets.values.append({
//       spreadsheetId,
//       range,
//       valueInputOption: 'RAW',
//       resource: {
//         values,
//       },
//     });
//     return response.data;
//   } catch (error) {
//     console.error('Error appending to Google Sheet:', error);
//     throw new Error('Error appending data to Google Sheet');
//   }
// };

// // Function to clear data from Google Sheets
// const clearSheetData = async (spreadsheetId, range) => {
//   try {
//     const response = await sheets.spreadsheets.values.clear({
//       spreadsheetId,
//       range,
//     });
//     return response.data;
//   } catch (error) {
//     console.error('Error clearing Google Sheet data:', error);
//     throw new Error('Error clearing data from Google Sheet');
//   }
// };

// // Initialize the app
// dotenv.config();
// const app = express();

// // Middlewares
// app.use(express.json());
// app.use(cors({
//   origin: "http://localhost:3000", // Adjust the frontend URL accordingly
//   credentials: true, // Allow session cookies
// }));
// app.use(helmet());
// app.use(session({
//   secret: 'your-secret-key',
//   resave: false,
//   saveUninitialized: false,
//   store: MongoStore.create({
//     mongoUrl: process.env.MONGO_URL,
//   }),
//   cookie: { secure: false, httpOnly: true },
// }));

// // Database connection
// mongoose
//   .connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log("DB connected"))
//   .catch((err) => console.error("DB not connected:", err));

// // Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/document", documentRoutes);
// app.use("/api/department", departmentRoutes);
// app.use("/api/file", files);
// app.use("/api/meeting", meetingRoutes);
// app.use("/api/community", communityRoutes);
// app.use("/api/events", eventRoutes); // Events route
// app.use("/api/google", googleAuth); // Google OAuth route

// // Example route to fetch data from Google Sheets
// app.get('/api/google/sheet', async (req, res) => {
//   const { spreadsheetId, range } = req.query;

//   if (!spreadsheetId || !range) {
//     return res.status(400).json({ message: 'spreadsheetId and range are required' });
//   }

//   try {
//     const sheetData = await getSheetData(spreadsheetId, range);
//     res.json({ success: true, data: sheetData });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // Example route to update data in Google Sheets
// app.put('/api/google/sheet/update', async (req, res) => {
//   const { spreadsheetId, range, values } = req.body;

//   if (!spreadsheetId || !range || !values) {
//     return res.status(400).json({ message: 'spreadsheetId, range, and values are required' });
//   }

//   try {
//     const updatedData = await updateSheetData(spreadsheetId, range, values);
//     res.json({ success: true, data: updatedData });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // Start server
// const PORT = process.env.PORT || 5001;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
