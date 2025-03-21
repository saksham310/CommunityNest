const express = require("express");
const { google } = require("googleapis");
const dotenv = require("dotenv");
const router = express.Router();

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL
);

const scopes = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar",
];

// Route to start OAuth2 process
router.get("/google", (req, res) => {
  const redirectUrl = req.query.redirect || "http://localhost:3000/meeting"; // Default redirect URL
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state: redirectUrl, // Pass the redirect URL as state
  });

  res.redirect(url);
});

router.get("/google/redirect", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: "Authorization code is missing" });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get the user's email (example using the Google People API)
    const people = google.people({ version: "v1", auth: oauth2Client });
    const profile = await people.people.get({
      resourceName: "people/me",
      personFields: "emailAddresses",
    });

    const userEmail = profile.data.emailAddresses[0].value;

    // Redirect to frontend with the token and email in the query string
    res.redirect(
      `http://localhost:3000/google-signin?auth=success&googleAuthToken=${tokens.access_token}&email=${userEmail}`
    );
  } catch (error) {
    console.error("Error authenticating:", error);
    res.redirect("http://localhost:3000/google-signin?auth=failure");
  }
});

module.exports = { router, oauth2Client };