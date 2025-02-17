const mongoose = require("mongoose");

// Define the schema for the document
const documentSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true 
    },
    content: { 
      type: String, 
      required: true 
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, // Reference to the User model (Original creator)
      ref: "users", 
      required: true 
    },
    department: { 
      type: mongoose.Schema.Types.ObjectId, // Reference to the Department model
      ref: "Department", 
      required: true 
    },
    lastEditedBy: { 
      type: mongoose.Schema.Types.ObjectId, // Store the last editor's user ID
      ref: "users",
      default: null 
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Create and export the model
const Document = mongoose.model("Document", documentSchema);
module.exports = Document;
