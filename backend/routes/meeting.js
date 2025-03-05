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
    'https://www.googleapis.com/auth/calendar'
];

// Route to start OAuth2 process
router.get("/google", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });

    res.redirect(url);
});

// Redirect from Google OAuth after authentication
router.get("/google/redirect", async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: "Authorization code is missing" });
    }

    try {
        // Exchange the authorization code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Store tokens in session
        req.session.userTokens = tokens;
        req.session.save(); // Ensure session is saved

        console.log("Authenticated successfully, tokens saved in session");

        // Redirect to frontend with the token in the query string
        res.redirect(`http://localhost:3000/meeting?auth=success&googleAuthToken=${tokens.access_token}`);
    } catch (error) {
        console.error("Error authenticating:", error);
        res.redirect("http://localhost:3000/meeting?auth=failure");
    }
});


// Middleware to check authentication
const ensureAuthenticated = (req, res, next) => {
    if (!req.session.userTokens) {
        return res.status(401).json({ error: "Unauthorized. Please authenticate first." });
    }
    oauth2Client.setCredentials(req.session.userTokens);

    // Handle token expiration
    if (oauth2Client.credentials.expiry_date <= Date.now()) {
        oauth2Client.refreshAccessToken((err, tokens) => {
            if (err) {
                return res.status(500).json({ error: "Failed to refresh token" });
            }
            req.session.userTokens = tokens;
            req.session.save();
            oauth2Client.setCredentials(tokens);
            next();
        });
    } else {
        next();
    }
};


// Schedule a meeting using the Google Calendar API
router.post('/schedule_meeting', ensureAuthenticated, async (req, res) => {
    try {
        const { summary, description, start, end, attendees } = req.body;

        // Validate input fields
        if (!summary || !description || !start || !end || !attendees || !Array.isArray(attendees)) {
            return res.status(400).json({ error: "All fields are required and attendees should be an array" });
        }

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

        res.json({ msg: 'Event scheduled successfully', eventLink: event.data.hangoutLink });
    } catch (error) {
        console.error('Error scheduling event:', error);
        res.status(500).json({ error: 'Failed to schedule event', details: error.toString() });
    }
});

// Fetch all scheduled meetings/events from Google Calendar
router.get('/events', ensureAuthenticated, async (req, res) => {
    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            auth: oauth2Client,
            timeMin: (new Date()).toISOString(), // Fetch only upcoming events
            maxResults: 50, // Adjust as needed
            singleEvents: true,
            orderBy: 'startTime',
        });
        

        res.json({ events: response.data.items });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to retrieve events', details: error.toString() });
    }
});

// Edit a meeting/event
router.put('/edit_meeting/:eventId', ensureAuthenticated, async (req, res) => {
    const { eventId } = req.params;
    const { summary, description, start, end, attendees } = req.body;
  
    // Validate input fields
    if (!summary || !description || !start || !end || !attendees || !Array.isArray(attendees)) {
        return res.status(400).json({ error: "All fields are required and attendees should be an array" });
    }

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

        // Send the response with the updated event details
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
  
  


module.exports = router;