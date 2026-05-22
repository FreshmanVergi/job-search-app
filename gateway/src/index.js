require("dotenv").config();
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client for token verification
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(helmet());
app.use(morgan("combined"));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// Auth middleware - verifies Supabase JWT
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

// Admin middleware
const adminMiddleware = async (req, res, next) => {
  await authMiddleware(req, res, () => {
    if (req.headers["x-user-role"] !== "admin" && req.headers["x-user-role"] !== "company") {
      return res.status(403).json({ error: "Forbidden: insufficient permissions" });
    }
    next();
  });
};

// Service URLs
const JOB_POSTING_SERVICE = process.env.JOB_POSTING_SERVICE_URL || "http://localhost:3001";
const JOB_SEARCH_SERVICE = process.env.JOB_SEARCH_SERVICE_URL || "http://localhost:3002";
const NOTIFICATION_SERVICE = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3003";

// Proxy options factory
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

// ─── ROUTES ────────────────────────────────────────────────────────────────

// Public routes - Job Posting Service
app.use("/api/v1/jobs", createProxyMiddleware(proxyOptions(JOB_POSTING_SERVICE)));
app.use("/api/v1/companies", createProxyMiddleware(proxyOptions(JOB_POSTING_SERVICE)));

// Authenticated routes - Admin job management
app.use(
  "/api/v1/admin/jobs",
  adminMiddleware,
  createProxyMiddleware(proxyOptions(JOB_POSTING_SERVICE))
);

// Authenticated routes - Job Search Service
app.use(
  "/api/v1/search",
  createProxyMiddleware(proxyOptions(JOB_SEARCH_SERVICE))
);

app.use(
  "/api/v1/recent-searches",
  authMiddleware,
  createProxyMiddleware(proxyOptions(JOB_SEARCH_SERVICE))
);

// Authenticated routes - Applications
app.use(
  "/api/v1/applications",
  authMiddleware,
  createProxyMiddleware(proxyOptions(JOB_POSTING_SERVICE))
);

// Authenticated routes - Job Alerts
app.use(
  "/api/v1/alerts",
  authMiddleware,
  createProxyMiddleware(proxyOptions(NOTIFICATION_SERVICE))
);

// AI Agent - authenticated
app.use(
  "/api/v1/ai",
  authMiddleware,
  createProxyMiddleware(proxyOptions(JOB_SEARCH_SERVICE))
);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      jobPosting: JOB_POSTING_SERVICE,
      jobSearch: JOB_SEARCH_SERVICE,
      notification: NOTIFICATION_SERVICE,
    },
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
