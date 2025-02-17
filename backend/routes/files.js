// module.exports = router;
const express = require("express");
const multer = require("multer");
const path = require("path");
const File = require("../models/File"); // Create this model
const router = express.Router();
const fs = require('fs');
const pdfParse = require("pdf-parse"); // For extracting text from PDFs
const cors = require('cors'); // Import CORS package
const User = require("../models/User"); // Assuming you have a User model

// Enable CORS
router.use(cors()); // This will allow all domains. For more strict control, you can specify allowed origins, like 'http://localhost:3000'

// Define uploads directory path
const UPLOADS_DIR = path.join(__dirname, '../uploads'); 

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR); // Store files in the uploads folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Use a timestamp to avoid name conflicts
  },
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
      return cb(new Error("Only PDF files are allowed"), false);
    }
    cb(null, true);
  }
});

// Route to upload file (only PDF allowed)
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
      filePath: req.file.filename, // Just store the filename

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
    let { department, userId } = req.params;

    // Fetch the user from the database to check their status
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // If the user is a member, update the userId to the adminId from communityDetails
    if (user.status === "member" && user.communityDetails.length > 0) {
      const adminId = user.communityDetails[0].adminId;
      userId = adminId;  // Update userId to adminId
    }

    // Now fetch the files based on the department and updated userId
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


// Route to delete a file
router.delete("/deleteFile/:id", async (req, res) => {
  try {
    const fileId = req.params.id;
    const result = await File.findByIdAndDelete(fileId);

    if (!result) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    // Delete the actual file from the filesystem
    const filePath = path.join(UPLOADS_DIR, result.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // Remove the file from the disk
    }

    res.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ success: false, message: "Error deleting file" });
  }
});

router.get('/view/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).send('File not found');

    const filePath = path.join(UPLOADS_DIR, file.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File does not exist on server');
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).send('Server error');
  }
});



// Route to extract text from a PDF file
router.post('/extract-text-pdf', upload.single('file'), (req, res) => {
  if (!req.file || path.extname(req.file.originalname) !== '.pdf') {
    return res.status(400).json({ error: "Please upload a PDF file." });
  }

  const pdfPath = path.join(UPLOADS_DIR, req.file.path);
  fs.readFile(pdfPath, (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read PDF file." });
    }

    pdfParse(data)
      .then((pdfData) => {
        res.json({ text: pdfData.text });
      })
      .catch((pdfErr) => {
        console.error('Error extracting text from PDF:', pdfErr);
        res.status(500).json({ error: "Failed to extract text from PDF." });
      });
  });
});

module.exports = router;
