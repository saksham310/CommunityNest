const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" }, // Add this line
  date: { type: String, required: true },
  time: { type: String, required: true },
  image: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { 
    type: String, 
    enum: ['Private', 'Announcement'], 
    default: 'Private' 
  },
  googleSheets: [
    {
      url: { type: String, required: true },
      title: { type: String, required: true },
    },
  ],
});

module.exports = mongoose.model("Event", eventSchema);



