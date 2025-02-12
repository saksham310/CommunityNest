const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetToken: { type: String, required: false },

  status: { type: String, enum: ["community", "member"], required: true },

  // If the user is a member, they can belong to multiple communities
  communities: { 
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Community" }], 
    default: [], 
  },

  // If the user is an admin, they manage a single community
  managedCommunity: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Community", 
    default: null, 
  }, 
});

module.exports = mongoose.model("User", UserSchema);
