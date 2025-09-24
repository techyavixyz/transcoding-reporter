const mongoose = require("mongoose");

const wacConfigSchema = new mongoose.Schema(
  {
    videoAppId: { type: String, required: true }, 
    appName: { type: String, required: true },
    description: { type: String },
    appUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { collection: "wac_configs" }
);

// Index for faster lookups
wacConfigSchema.index({ videoAppId: 1 });

module.exports = mongoose.model("wac_configs", wacConfigSchema);
