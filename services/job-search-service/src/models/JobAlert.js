const mongoose = require("mongoose");

const jobAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    keywords: [String],
    country: String,
    city: String,
    district: String,
    workPreference: String,
    workType: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    lastNotifiedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobAlert", jobAlertSchema);
