const express = require('express');
const { google } = require('googleapis');
const dotenv = require("dotenv");
const router = express.Router();
const session = require('express-session');
const { v4: uuid } = require('uuid');
const User = require("../models/User"); // Assuming you have a User model
const Community = require("../models/Community"); // Assuming you have a Community model

dotenv.config();



// Set up session handling (make sure this is also in your main server file)
router.use(session({
    secret: 'your_secret_key', 
    resave: false, 
    saveUninitialized: true,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/gmail.send', // Add this scope for Gmail API
  ];
  
  // Route to start OAuth2 process
  router.get("/google", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  
    res.redirect(url);
  });

  router.get("/google/redirect", async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: "Authorization code is missing" });
    }
  
    try {
      // Exchange the authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
  
      // Store token and email securely in HTTP-only cookies
      res.cookie("googleAuthToken", tokens.access_token, {
        httpOnly: true, // Prevents access from JavaScript
        secure: process.env.NODE_ENV === "production", // Secure only in production
        sameSite: "Strict", // Prevents CSRF
        maxAge: 7 * 24 * 60 * 60 * 1000, // Set expiry to 7 days
        path: "/", // Make the cookie accessible across all routes
      });
  
      res.cookie("googleAuthEmail", tokens.email, {
        httpOnly: true, // Prevents access from JavaScript
        secure: process.env.NODE_ENV === "production", // Secure only in production
        sameSite: "Strict", // Prevents CSRF
        maxAge: 7 * 24 * 60 * 60 * 1000, // Set expiry to 7 days
        path: "/", // Make the cookie accessible across all routes
      });
  
      console.log("Authenticated successfully, token and email stored in cookies");
  
      // Redirect to frontend without exposing token in the URL
      res.redirect("http://localhost:3000/meeting?auth=success");
    } catch (error) {
      console.error("Error authenticating:", error);
      res.redirect("http://localhost:3000/meeting?auth=failure");
    }
  });
  
  const ensureAuthenticated = (req, res, next) => {
    const token = req.cookies.googleAuthToken; // Read token from cookie
  
    console.log("Token from cookie:", token); // Log the token
  
    if (!token) {
      console.error("No token found in cookies");
      return res.status(401).json({ error: "Unauthorized. Please authenticate first." });
    }
  
    // Set credentials for Google Calendar API
    oauth2Client.setCredentials({ access_token: token });
  
    // Handle token expiration
    if (oauth2Client.credentials.expiry_date <= Date.now()) {
      console.log("Token expired, refreshing...");
      oauth2Client.refreshAccessToken(async (err, tokens) => {
        if (err) {
          console.error("Failed to refresh token:", err);
          return res.status(500).json({ error: "Failed to refresh token" });
        }
  
        // Update the token in cookies
        res.cookie("googleAuthToken", tokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "Strict",
          maxAge: tokens.expiry_date - Date.now(),
        });
  
        // Set the new tokens for Google Calendar API
        oauth2Client.setCredentials(tokens);
  
        // Proceed to the next middleware/route
        next();
      });
    } else {
      console.log("Token is valid");
      next();
    }
  };

const people = google.people({ version: 'v1', auth: oauth2Client });

//check if the user is authenticated
router.get("/check-auth", ensureAuthenticated, (req, res) => {
    res.json({ authenticated: true });
});


router.post('/schedule_meeting', ensureAuthenticated, async (req, res) => {
    try {
        const { summary, description, start, end, attendees } = req.body;

        console.log("Request body:", { summary, description, start, end, attendees });

        // Validate input fields
        if (!summary || !description || !start || !end || !attendees || !Array.isArray(attendees)) {
            console.error("Validation failed: Missing required fields");
            return res.status(400).json({ error: "All fields are required and attendees should be an array" });
        }

        console.log("Scheduling event with data:", { summary, description, start, end, attendees });

        // Create the event using Google Calendar API
        const event = await calendar.events.insert({
            calendarId: 'primary',
            auth: oauth2Client,
            conferenceDataVersion: 1,
            requestBody: {
                summary,
                description,
                start: { dateTime: new Date(start).toISOString(), timeZone: 'Asia/Kathmandu' },
                end: { dateTime: new Date(end).toISOString(), timeZone: 'Asia/Kathmandu' },
                attendees: attendees.map(email => ({ email })),
                conferenceData: {
                    createRequest: {
                        requestId: uuid(),
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                },
            },
        });

        console.log("Event scheduled successfully:", event.data);
        res.json({ msg: 'Event scheduled successfully', eventLink: event.data.hangoutLink });
    } catch (error) {
        console.error('Error scheduling event:', error);
        res.status(500).json({ error: 'Failed to schedule event', details: error.toString() });
    }
});

router.get('/events', ensureAuthenticated, async (req, res) => {
    try {
        console.log("Fetching events from Google Calendar...");
        const response = await calendar.events.list({
            calendarId: 'primary',
            auth: oauth2Client,
            timeMin: (new Date()).toISOString(), // Fetch only upcoming events
            maxResults: 50, // Adjust as needed
            singleEvents: true,
            orderBy: 'startTime',
        });

        console.log("Events fetched successfully:", response.data.items);
        res.json({ events: response.data.items });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to retrieve events', details: error.toString() });
    }
});


router.put('/edit_meeting/:eventId', ensureAuthenticated, async (req, res) => {
    const { eventId } = req.params;
    const { summary, description, start, end, attendees } = req.body;

    console.log("Request body:", { summary, description, start, end, attendees });

    // Validate input fields
    if (!summary || !description || !start || !end || !attendees || !Array.isArray(attendees)) {
        console.error("Validation failed: Missing required fields or attendees is not an array");
        return res.status(400).json({ error: "All fields are required and attendees should be an array" });
    }

    console.log("Editing event with data:", { summary, description, start, end, attendees });

    try {
        // Prepare the event data for Google Calendar
        const event = await calendar.events.update({
            calendarId: 'primary',
            eventId,
            requestBody: {
                summary,
                description,
                start: { 
                    dateTime: new Date(start).toISOString(), 
                    timeZone: 'Asia/Kathmandu' 
                },
                end: { 
                    dateTime: new Date(end).toISOString(), 
                    timeZone: 'Asia/Kathmandu' 
                },
                attendees: attendees.map((email) => ({ email })),
            },
        });

        console.log("Event updated successfully:", event.data);
        res.json({ msg: 'Event updated successfully', eventLink: event.data.hangoutLink });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Failed to update event', details: error.toString() });
    }
});
 
// Delete a meeting/event
router.delete('/delete_meeting/:eventId', ensureAuthenticated, async (req, res) => {
    const { eventId } = req.params;

    try {
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
            auth: oauth2Client,
        });

        res.json({ msg: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event', details: error.toString() });
    }
});

router.get("/community/members", async (req, res) => {
    try {
      const { userId } = req.query; // Get userId from query parameters
  
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
  
      const user = await User.findById(userId); // Fetch user details
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      let memberIds = [];
  
      if (user.status === "community") {
        // For 'community' status, get members of the community where userId is the admin
        const community = await Community.findOne({ admin: userId });
        if (!community) return res.status(404).json({ error: "Community not found" });
        memberIds = community.members;
      } else if (user.status === "member") {
        // For 'member' status, get the community where the user is a member
        const community = await Community.findOne({ admin: user.communityDetails[0].adminId });
        if (!community) return res.status(404).json({ error: "Community not found" });
        memberIds = community.members;
      }
  
      // Fetch the user details of all members using their memberIds
      const members = await User.find({ _id: { $in: memberIds } }, "email");
      const emails = members.map((member) => member.email);
  
      res.json({ emails });
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  
  router.get("/user/email", ensureAuthenticated, (req, res) => {
    const email = req.cookies.googleAuthEmail;
    if (!email) {
        return res.status(404).json({ error: "Email not found" });
    }
    res.json({ email });
});

module.exports = router;