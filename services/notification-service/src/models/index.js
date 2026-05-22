const mongoose = require("mongoose");

const jobAlertSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true },
    keywords: [String],
    country: String,
    city: String,
    district: String,
    workPreference: String,
    workType: String,
    isActive: { type: Boolean, default: true },
    lastNotifiedAt: Date,
  },
  { timestamps: true }
);

const jobSearchSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    userEmail: String,
    query: {
      position: String,
      city: String,
      country: String,
      workPreference: String,
      workType: String,
    },
    resultsCount: Number,
    searchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

jobAlertSchema.index({ userId: 1, isActive: 1 });
jobSearchSchema.index({ userId: 1, searchedAt: -1 });

module.exports = {
  JobAlert: mongoose.model("JobAlert", jobAlertSchema),
  JobSearch: mongoose.model("JobSearch", jobSearchSchema),
};
