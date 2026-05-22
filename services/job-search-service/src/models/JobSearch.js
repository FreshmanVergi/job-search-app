const mongoose = require("mongoose");

const jobSearchSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: String,
    query: {
      position: String,
      city: String,
      country: String,
      workPreference: String,
      workType: String,
    },
    resultsCount: Number,
    searchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for efficient recent searches lookup
jobSearchSchema.index({ userId: 1, searchedAt: -1 });

module.exports = mongoose.model("JobSearch", jobSearchSchema);
