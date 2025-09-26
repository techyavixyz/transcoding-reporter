// db/driveModel.js
const mongoose = require("mongoose");

const driveSchema = new mongoose.Schema(
  {
    videoAppId: { type: mongoose.Schema.Types.ObjectId, required: true },
    appId: { type: mongoose.Schema.Types.ObjectId }, // WAC ID field
    title: { type: String },
    encodeId: { type: String },
    videoMetadata: {
      duration: { type: Number }, 
      size: { type: Number }     
    },
    webhookResponse: {
      status: { type: String },
      sourceUrl: { type: String }
    },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: "drives" }
);

// Performance indexes
driveSchema.index({ createdAt: -1 }); // Most important - for date range queries
driveSchema.index({ "webhookResponse.status": 1 }); // For status filtering
driveSchema.index({ videoAppId: 1 }); // For WAC config lookups
driveSchema.index({ appId: 1 }); // For WAC ID lookups
driveSchema.index({ encodeId: 1 }); // For encode ID searches
driveSchema.index({ createdAt: -1, "webhookResponse.status": 1 }); // Compound index for common queries

module.exports = { schema: driveSchema };
