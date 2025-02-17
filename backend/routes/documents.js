const express = require("express");
const multer = require("multer");
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


// Get documents by department and user (handles community & member status)
router.get("/getDocumentsByDepartmentAndUser/:departmentId/:userId", async (req, res) => {
  try {
    const { departmentId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid department or user ID" });
    }

    // Find user details
    const user = await User.findById(userId).populate("communityDetails.communityId");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let fetchUserId = userId; // Default: use logged-in userId

    if (user.status === "member") {
      const adminId = user.communityDetails[0]?.adminId; // Fetch the admin ID for the community
      if (!adminId) {
        return res.status(400).json({ success: false, message: "Admin ID not found for the member" });
      }
      fetchUserId = adminId; // Use adminId to fetch documents
    }

    // Fetch documents based on the correct user ID
    const documents = await Document.find({
      department: departmentId,
      userId: fetchUserId,
    })
      .populate("department", "name")
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

router.delete("/deleteDocument/:id", async (req, res) => {
  try {
    const { id } = req.params; // Extract ID from URL

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid document ID" });
    }

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

router.put("/editDocument", async (req, res) => {
  try {
    const { id, title, content, department, userId } = req.body;

    // Check if all required fields exist
    if (!id || !title || !content || !department || !userId) {
      return res.status(400).json({
        success: false,
        message: "All fields (id, title, content, department, userId) are required",
      });
    }

    // Validate if department exists
    const departmentData = await Department.findById(department).exec();
    if (!departmentData) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    // Validate if user exists
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Validate permissions
    if (user.status !== "community" && user.status !== "member") {
      return res.status(403).json({ success: false, message: "You do not have permission to edit this document." });
    }

    // Find the existing document
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    // Update the document fields
    document.title = title;
    document.content = content;
    document.department = departmentData._id;
    document.lastEditedBy = userId; // Ensure last editor is updated

    await document.save();

    res.status(200).json({ 
      success: true, 
      message: "Document updated successfully!", 
      document 
    });

  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ success: false, message: "Error updating document", error: error.message });
  }
});




// Get a document by ID
router.get("/getDocumentById/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the document ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    // Find the document by ID
    const document = await Document.findById(id)
      .populate("department", "name") // If needed, populate department name
      .exec();

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.status(200).json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching document",
      error: error.message,
    });
  }
});


module.exports = router;

