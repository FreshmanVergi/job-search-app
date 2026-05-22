require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const { connectQueue } = require("./lib/queue");
const { startSchedulers } = require("./schedulers/jobNotifications");
const { startQueueConsumers } = require("./schedulers/queueConsumer");

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) =>
  res.json({ status: "ok", service: "notification-service" })
);

// Manual trigger endpoints (for testing / admin)
app.post("/api/v1/notify/trigger-alerts", async (req, res) => {
  const { runJobAlertNotifications } = require("./schedulers/jobNotifications");
  runJobAlertNotifications().catch(console.error); // async, don't wait
  res.json({ message: "Job alert notifications triggered" });
});

app.post("/api/v1/notify/trigger-related", async (req, res) => {
  const { runRelatedJobNotifications } = require("./schedulers/jobNotifications");
  runRelatedJobNotifications().catch(console.error);
  res.json({ message: "Related job notifications triggered" });
});

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: "job_search_db" });
    console.log("MongoDB connected (notification-service)");

    await connectQueue();
    await startQueueConsumers();
    startSchedulers();

    app.listen(PORT, () =>
      console.log(`Notification Service running on port ${PORT}`)
    );
  } catch (err) {
    console.error("Failed to start notification service:", err);
    process.exit(1);
  }
};

start();
