require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { connectMongo } = require("./lib/mongo");
const { connectRedis } = require("./lib/redis");

const searchRouter = require("./routes/search");
const recentSearchesRouter = require("./routes/recentSearches");
const aiRouter = require("./routes/ai");

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

app.use("/api/v1/search", searchRouter);
app.use("/api/v1/recent-searches", recentSearchesRouter);
app.use("/api/v1/alerts", recentSearchesRouter); // alerts handled in same router
app.use("/api/v1/ai", aiRouter);

app.get("/health", (req, res) =>
  res.json({ status: "ok", service: "job-search-service" })
);

const start = async () => {
  await connectMongo();
  await connectRedis();
  app.listen(PORT, () =>
    console.log(`Job Search Service running on port ${PORT}`)
  );
};

start();
