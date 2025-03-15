const express = require("express");

const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
const Event = require("../models/Event");
const authenticate = require("./authenticate");
const User = require('../models/User');
const nodemailer = require("nodemailer");

const router = express.Router();

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

// Backend API endpoint for sending emails
router.post("/api/send-feedback-emails", async (req, res) => {
  const { emails, subject, message } = req.body;

  try {
    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "your-email@gmail.com", // Replace with your email
        pass: "your-email-password", // Replace with your email password
      },
    });

    // Send emails to all recipients
    const emailPromises = emails.map((email) => {
      return transporter.sendMail({
        from: "your-email@gmail.com",
        to: email,
        subject: subject,
        text: message,
      });
    });

    await Promise.all(emailPromises);

    res.status(200).json({ message: "Emails sent successfully!" });
  } catch (error) {
    console.error("Error sending emails:", error);
    res.status(500).json({ message: "Failed to send emails" });
  }
});

module.exports = router;
