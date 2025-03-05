const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true }, // New time field
  image: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  spreadsheetId: { type: String, default: null }, // Add Google Sheet ID field
 
});

module.exports = mongoose.model("Event", eventSchema);
