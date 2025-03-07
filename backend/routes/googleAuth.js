// // googleAuth.js
// const express = require('express');
// const { google } = require('googleapis');
// const router = express.Router(); // Initialize the router

// const oauth2Client = new google.auth.OAuth2(
//   process.env.CLIENT_ID,
//   process.env.CLIENT_SECRET,
//   process.env.REDIRECT_URI
// );

// // The required scope for offline access and refresh token
// const scopes = ['https://www.googleapis.com/auth/calendar', 'offline'];

// router.get('/auth', (req, res) => {
//   const url = oauth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: scopes,
//   });
//   res.redirect(url);
// });

// // Export the router properly
// module.exports = router;
