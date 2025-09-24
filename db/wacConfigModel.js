const mongoose = require("mongoose");

const wacConfigSchema = new mongoose.Schema(
  {
    videoAppId: { type: String, required: true }, 
    appName: { type: String, required: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { collection: "wac_configs" }
);

module.exports = mongoose.model("wac_configs", wacConfigSchema);
