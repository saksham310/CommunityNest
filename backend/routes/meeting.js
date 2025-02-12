const express = require('express');
const { google } = require('googleapis');
const dotenv = require("dotenv");
const router = express.Router();
const session = require('express-session');
const { v4: uuid } = require('uuid');

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

        res.redirect("http://localhost:3000/meeting?auth=success");
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
    next();
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




module.exports = router;
