const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");  // Import helmet for security
const authRoutes = require("./routes/auth");
const documentRoutes = require("./routes/documents");
const departmentRoutes = require("./routes/department");
const files = require("./routes/files");
const meetingRoutes = require("./routes/meeting");
const session = require('express-session');
const MongoStore = require("connect-mongo");

dotenv.config();

const app = express();

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL,  // Ensure you're using a persistent session store
  }),
  cookie: { secure: false, httpOnly: true },  // secure: true for HTTPS
}));



// Middleware
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",  // Allow requests from your frontend
  credentials: true,  // Allow session cookies
}));
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

// Database connection
mongoose
  .connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("DB connected"))
  .catch((err) => console.error("DB not connected:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/file", files);
app.use("/api/meeting", meetingRoutes);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
