const express = require("express");
const multer = require("multer");
const path = require("path");
const File = require("../models/File"); // Create this model
const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/"); // Ensure this folder exists
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    },
  });
  
  const upload = multer({ storage: storage });
  
  router.post("/upload", upload.single("file"), async (req, res) => {
    try {
      console.log("Request body:", req.body); // Debugging
      console.log("Uploaded file:", req.file); // Debugging
  
      // Ensure required fields are present
      if (!req.body.filename || !req.body.fileType || !req.body.department || !req.body.userId) {
        return res.status(400).json({ error: "filename, fileType, department, and userId are required." });
      }
  
      const newFile = new File({
        filename: req.body.filename,
        filePath: req.file.path, // This comes from multer
        fileType: req.body.fileType,
        department: req.body.department,
        userId: req.body.userId,
      });
  
      await newFile.save();
      res.json({ message: "File uploaded successfully!", file: newFile });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "File upload failed" });
    }
  });
  
// Route to get files by department and user
router.get("/getFilesByDepartmentAndUser/:department/:userId", async (req, res) => {
  try {
    const { department, userId } = req.params;
    const files = await File.find({ department, userId });

    if (files.length === 0) {
      return res.status(200).json({ success: true, message: "No files found", files: [] });
    }

    res.status(200).json({ success: true, files });
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ success: false, message: "Error fetching files" });
  }
});

router.delete("/deleteFile/:id", async (req, res) => {
    try {
      const fileId = req.params.id;
      const result = await File.findByIdAndDelete(fileId);
  
      if (!result) {
        return res.status(404).json({ success: false, message: "File not found" });
      }
  
      res.json({ success: true, message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ success: false, message: "Error deleting file" });
    }
  });
  

module.exports = router;
