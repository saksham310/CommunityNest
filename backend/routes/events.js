const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
const Event = require("../models/Event");
const authenticate = require("./authenticate");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const router = express.Router();
const ensureAuthenticated = require("./meeting.js"); // Import the middleware if not already present
const { OAuth2Client } = require("google-auth-library");

dotenv.config();

// Cloudinary configuration
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
    console.error("Error creating event:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Fetch all events
router.get("/", authenticate, async (req, res) => {
  try {
    let events;

    // Fetch the user based on the userId
    const user = await User.findById(req.userId).select("status communityDetails");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if the logged-in user is a member
    if (user.status === "member") {
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

// Delete an event
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

// Update an event
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
    console.error("Error updating event:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Fetch event title
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


const oauth2Client = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL
);
router.post("/send-feedback-email", ensureAuthenticated, async (req, res) => {
  try {
      console.log("Request received at /send-feedback-email");
      console.log("Request body:", req.body);

      // Retrieve tokens and email from cookies
      const token = req.cookies.googleAuthToken;
      const refreshToken = req.cookies.googleAuthRefreshToken;
      const email = req.cookies.googleAuthEmail;

      console.log("Token from cookie:", token);
      console.log("Refresh token from cookie:", refreshToken);
      console.log("Email from cookie:", email);

      if (!token || !refreshToken || !email) {
          console.error("Token, refresh token, or email not found in cookies.");
          return res.status(401).json({ error: "Unauthorized. Please authenticate first." });
      }

      // Set credentials for OAuth2Client
      oauth2Client.setCredentials({
          access_token: token,
          refresh_token: refreshToken,
      });

      // Check if the token is expired
      if (oauth2Client.credentials.expiry_date && oauth2Client.credentials.expiry_date < Date.now()) {
          console.log("Token is expired. Refreshing token...");
          const { credentials } = await oauth2Client.refreshAccessToken();
          oauth2Client.setCredentials(credentials);

          // Update the token in cookies
          res.cookie("googleAuthToken", credentials.access_token, {
              httpOnly: false,
              secure: process.env.NODE_ENV === "production",
              sameSite: "Strict",
              maxAge: 7 * 24 * 60 * 60 * 1000,
              path: "/",
          });

          console.log("Token refreshed successfully:", credentials.access_token);
      }

      // Create a Nodemailer transporter using OAuth2
      const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
              type: "OAuth2",
              user: email,
              clientId: process.env.CLIENT_ID,
              clientSecret: process.env.CLIENT_SECRET,
              refreshToken: refreshToken,
              accessToken: token,
          },
      });

      console.log("Nodemailer transporter created successfully.");

      // Define email options
      const mailOptions = {
          from: email,
          to: req.body.to.join(", "), // Join the array of emails into a comma-separated string
          subject: req.body.subject,
          text: req.body.message,
          html: `<p>${req.body.message}</p>`, // Optional: Add HTML version of the message
      };

      console.log("Sending email with options:", mailOptions);

      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.response);

      res.json({ message: "Feedback emails sent successfully", info });
  } catch (error) {
      console.error("Error sending feedback emails:", error);
      res.status(500).json({ error: "Failed to send feedback emails", details: error.message });
  }
});

module.exports = router;