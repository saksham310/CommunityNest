const mongoose = require("mongoose");

const CommunitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin of the community
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // List of members
});

module.exports = mongoose.model("Community", CommunitySchema);
