require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const jobsRouter = require("./routes/jobs");
const companiesRouter = require("./routes/companies");
const applicationsRouter = require("./routes/applications");
const { connectRedis } = require("./lib/redis");
const { connectQueue } = require("./lib/queue");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

// Routes - versioned
app.use("/api/v1/jobs", jobsRouter);
app.use("/api/v1/companies", companiesRouter);
app.use("/api/v1/applications", applicationsRouter);
app.use("/api/v1/admin/jobs", jobsRouter); // same router, gateway handles auth

app.get("/health", (req, res) =>
  res.json({ status: "ok", service: "job-posting-service" })
);

// Start
const start = async () => {
  try {
    await connectRedis();
    await connectQueue();
    app.listen(PORT, () =>
      console.log(`Job Posting Service running on port ${PORT}`)
    );
  } catch (err) {
    console.error("Failed to start service:", err);
    process.exit(1);
  }
};

start();
