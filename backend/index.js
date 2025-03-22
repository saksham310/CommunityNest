const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cookieParser = require("cookie-parser");
const path = require("path");

// Import routes
const authRoutes = require("./routes/auth");
const documentRoutes = require("./routes/documents");
const departmentRoutes = require("./routes/department");
const files = require("./routes/files");
const meetingRoutes = require("./routes/meeting");
const communityRoutes = require("./routes/community");
const eventRoutes = require("./routes/events");
const googleSheetsRoutes = require("./routes/googleSheetsRoutes");
const googleAuth = require("./routes/googleAuth");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware to parse cookies
app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key", // Use environment variable for secret
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL, // Use MongoDB for session storage
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Allow cross-site cookies in production
    },
  })
);

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOptions = {
  origin: "http://localhost:3000", // Allow frontend to communicate
  methods: "GET,POST,PUT,DELETE,OPTIONS", // Include OPTIONS for preflight requests
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow session cookies
};
app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions)); // Allow preflight requests for all routes

// Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Allow inline scripts
          "'unsafe-eval'",
          "https://apis.google.com",
          "https://accounts.google.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "https://www.googleapis.com",
          "https://oauth2.googleapis.com",
        ],
        frameSrc: ["https://accounts.google.com", "https://www.googleapis.com"],
      },
    },
  })
);

// Serve static files (uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
app.use("/api/community", communityRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/google-sheets", googleSheetsRoutes);
app.use("/api/google", googleAuth.router);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));