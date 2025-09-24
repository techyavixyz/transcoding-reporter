// db/driveModel.js
const mongoose = require("mongoose");

const driveSchema = new mongoose.Schema(
  {
    videoAppId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String },
    videoMetadata: {
      duration: { type: Number }, 
      size: { type: Number }     
    },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: "drives" }
);

module.exports = { schema: driveSchema };
