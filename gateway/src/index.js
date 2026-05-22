require("dotenv").config();
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { realtime: { transport: ws } }
);

app.use(helmet());
app.use(morgan("combined"));
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid token" });
  }
  req.headers["x-user-id"] = data.user.id;
  req.headers["x-user-email"] = data.user.email;
  req.headers["x-user-role"] = data.user.user_metadata?.role || "user";
  next();
};

const adminMiddleware = async (req, res, next) => {
  await authMiddleware(req, res, () => {
    if (req.headers["x-user-role"] !== "admin" && req.headers["x-user-role"] !== "company") {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  });
};

const JOB_POSTING_SERVICE = process.env.JOB_POSTING_SERVICE_URL || "http://localhost:3001";
const JOB_SEARCH_SERVICE = process.env.JOB_SEARCH_SERVICE_URL || "http://localhost:3002";
const NOTIFICATION_SERVICE = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3003";

const proxyOptions = (target) => ({
  target,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      console.error("Proxy error:", err.message);
      res.status(502).json({ error: "Service temporarily unavailable" });
    },
  },
});

app.use("/api/v1/jobs", createProxyMiddleware(proxyOptions(JOB_POSTING_SERVICE)));
app.use("/api/v1/companies", createProxyMiddleware(proxyOptions(JOB_POSTING_SERVICE)));
app.use("/api/v1/admin/jobs", adminMiddleware, createProxyMiddleware(proxyOptions(JOB_POSTING_SERVICE)));
app.use("/api/v1/search", createProxyMiddleware(proxyOptions(JOB_SEARCH_SERVICE)));
app.use("/api/v1/recent-searches", authMiddleware, createProxyMiddleware(proxyOptions(JOB_SEARCH_SERVICE)));
app.use("/api/v1/applications", authMiddleware, createProxyMiddleware(proxyOptions(JOB_POSTING_SERVICE)));
app.use("/api/v1/alerts", authMiddleware, createProxyMiddleware(proxyOptions(NOTIFICATION_SERVICE)));
app.use("/api/v1/ai", authMiddleware, createProxyMiddleware(proxyOptions(JOB_SEARCH_SERVICE)));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));