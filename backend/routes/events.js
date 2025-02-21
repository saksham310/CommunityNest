const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
const Event = require("../models/Event");

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const router = express.Router();

// Multer setup for file uploads (storing in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create an Event
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, date } = req.body;
    if (!title || !date || !req.file) {
      return res.status(400).json({ error: "All fields and image are required." });
    }

    // Upload image to Cloudinary
    cloudinary.uploader.upload_stream({ folder: "events" }, async (error, result) => {
      if (error) {
        console.error("Cloudinary error:", error);
        return res.status(500).json({ error: "Error uploading image to Cloudinary" });
      }

      // Save event details to the database
      const newEvent = new Event({
        title,
        date,
        image: result.secure_url, // Store the Cloudinary URL
      });

      await newEvent.save();
      res.status(201).json(newEvent);
    }).end(req.file.buffer);
  } catch (error) {
    console.error("Internal server error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Fetch All Events
router.get("/", async (req, res) => {
    try {
      const events = await Event.find();
      if (!events) {
        return res.status(404).json({ error: "No events found" });
      }
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Internal Server Error" });
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
  

module.exports = router;
