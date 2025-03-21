const express = require("express");

const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
const Event = require("../models/Event");
const authenticate = require("./authenticate");
const User = require('../models/User');
const nodemailer = require("nodemailer");

const router = express.Router();
const ensureAuthenticated = require('./meeting.js'); // Import the middleware if not already present

dotenv.config();

//for image 
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Multer setup for file uploads (storing in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create an Event (Requires Authentication)
router.post("/", authenticate, upload.single("image"), async (req, res) => {
  try {
    const { title, date, time } = req.body;

    if (!title || !date || !time || !req.file) {
      return res.status(400).json({ success: false, message: "All fields and image are required." });
    }

    cloudinary.uploader.upload_stream({ folder: "events" }, async (error, result) => {
      if (error) {
        return res.status(500).json({ success: false, message: "Error uploading image to Cloudinary" });
      }

      const newEvent = new Event({
        title,
        date,
        time, // Store time
        image: result.secure_url,
        createdBy: req.userId,
      });

      await newEvent.save();
      res.status(201).json({ success: true, event: newEvent });
    }).end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/", authenticate, async (req, res) => {
  try {
    let events;

    // Fetch the user based on the userId
    const user = await User.findById(req.userId).select('status communityDetails');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if the logged-in user is a member
    if (user.status === 'member') {
      // If the user is a member, fetch events by the adminId from the communityDetails
      const adminId = user.communityDetails[0]?.adminId;

      if (!adminId) {
        return res.status(400).json({ success: false, message: "Admin ID not found in community details." });
      }

      // Fetch events where the createdBy is the adminId of the community
      events = await Event.find({ createdBy: adminId });
    } else {
      // If the user is not a member, fetch events created by the user themselves
      events = await Event.find({ createdBy: req.userId });
    }

    res.json({ success: true, events });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Extract Cloudinary public_id from image URL
    const imageUrl = event.image;
    const publicId = imageUrl.split("/").pop().split(".")[0]; // Extract Cloudinary public_id

    // Delete image from Cloudinary
    await cloudinary.uploader.destroy(`events/${publicId}`);

    // Delete event from MongoDB
    await Event.findByIdAndDelete(id);

    res.json({ message: "Event and image deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Error deleting event" });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const { title, date, time } = req.body;
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { title, date, time },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    res.json({ success: true, event: updatedEvent });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/:id/title", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select("title"); // Only fetch the title

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    res.json({ title: event.title }); // Send only the title
  } catch (error) {
    console.error("Error fetching event title:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});


router.post('/send-feedback-emails', ensureAuthenticated, async (req, res) => {
  const { emails, subject, message } = req.body;

  // Retrieve the access token and email from cookies
  const accessToken = req.cookies.googleAuthToken;
  const userEmail = req.cookies.googleAuthEmail;

  console.log("Token from cookies (backend):", accessToken);
  console.log("Email from cookies (backend):", userEmail);

  if (!accessToken || !userEmail) {
    return res.status(401).json({ error: "Unauthorized. Please authenticate first." });
  }

  // Create a Nodemailer transporter using OAuth2
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: userEmail, // Use the logged-in user's email from cookies
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      accessToken: accessToken, // Use the access token from cookies
    },
  });

  // Define email options
  const mailOptions = {
    from: userEmail, // Sender address (logged-in user's email)
    to: emails.join(', '), // Recipient emails (comma-separated)
    subject: subject, // Email subject
    text: message, // Plain text body
    html: `<p>${message}</p>`, // HTML body (optional)
  };

  // Send the email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ', info.response);
    res.status(200).json({ message: 'Feedback emails sent successfully' });
  } catch (error) {
    console.error('Error sending email: ', error);

    // If the token is expired, refresh it
    if (error.code === 'EAUTH' && error.responseCode === 535) {
      try {
        const { tokens } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(tokens);

        // Update the token in cookies
        res.cookie("googleAuthToken", tokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "Strict",
          maxAge: tokens.expiry_date - Date.now(),
          path: "/", // Make the cookie accessible across all routes
        });

        // Retry sending the email
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent after token refresh: ', info.response);
        res.status(200).json({ message: 'Feedback emails sent successfully' });
      } catch (refreshError) {
        console.error('Error refreshing token: ', refreshError);
        res.status(500).json({ error: 'Failed to refresh token and send feedback emails' });
      }
    } else {
      res.status(500).json({ error: 'Failed to send feedback emails' });
    }
  }
});

module.exports = router;