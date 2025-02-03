const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Document = require("../models/Document");
const Department = require("../models/Department"); // Assuming you have this model
const User = require("../models/User"); // Assuming you have a User model


// Create a new document
router.post("/createDocument", async (req, res) => {
  try {
    const { title, content, department, userId } = req.body;

    if (!title || !content || !department || !userId) {
      return res.status(400).json({
        success: false,
        message: "All fields (title, content, department, userId) are required",
      });
    }

    // Ensure the department exists
    const departmentData = await Department.findById(department).exec();
    if (!departmentData) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Ensure the user exists
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create and save the new document
    const newDocument = new Document({
      title,
      content,
      userId,
      department: departmentData._id, // Store department ID
    });

    await newDocument.save();

    res.status(201).json({
      success: true,
      message: "Document created successfully!",
      newDocument,
    });
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({
      success: false,
      message: "Error creating document",
      error: error.message,
    });
  }
});


// Get documents by department and user
router.get("/getDocumentsByDepartmentAndUser/:departmentId/:userId", async (req, res) => {
  try {
    const { departmentId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid department or user ID" });
    }

    // Fetch documents for the given department and user
    const documents = await Document.find({
      department: departmentId,  // Ensure this is the correct field name
      userId: userId,            // Ensure this is the correct field name
    })
    .populate("department", "name")  // Populate department name if 'department' is correctly set as ref
    .exec();

    if (documents.length === 0) {
      return res.status(200).json({ success: true, message: "Repository empty", documents: [] });
    }

    res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error("Error fetching documents:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching documents",
      error: error.message,
    });
  }
});


// Delete a document
router.delete("/deleteDocument", async (req, res) => {
  try {
    const { id } = req.body;

    const deletedDocument = await Document.findByIdAndDelete(id);

    if (!deletedDocument) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    res.status(200).json({ success: true, message: "Document deleted!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting document", error });
  }
});

// Delete department and all documents in it only if the document repository is empty
router.delete("/deleteByDepartment/:departmentName", async (req, res) => {
  try {
    const { departmentName } = req.params;

    // Check if there are any documents in the department by department name
    const documents = await Document.find({ department: departmentName });

    if (documents.length > 0) {
      return res.status(400).json({
        success: false,
        message: "The department's document repository is not empty. Please empty the repository before deleting the department.",
      });
    }

    // Remove department from Department collection
    await Department.findOneAndDelete({ name: departmentName });

    res.status(200).json({
      success: true,
      message: `The department '${departmentName}' has been deleted as its document repository is empty.`,
    });
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting the department",
      error: error.message,
    });
  }
});

module.exports = router;

