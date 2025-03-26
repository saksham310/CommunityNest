// models/Notice.js
const mongoose = require("mongoose");

// In your Notice model
const NoticeSchema = new mongoose.Schema({
    content: { 
      type: String, 
      required: true,
      minlength: 5,
      maxlength: 2000 
    },
    communityId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Community", 
      required: true 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  }, {
    timestamps: true // Adds createdAt and updatedAt automatically
  });
  
module.exports = mongoose.model("Notice", NoticeSchema);