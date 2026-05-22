const express = require("express");
const JobSearch = require("../models/JobSearch");
const JobAlert = require("../models/JobAlert");
const { body, validationResult } = require("express-validator");

const router = express.Router();

const getUser = (req) => ({
  id: req.headers["x-user-id"],
  email: req.headers["x-user-email"],
});

// GET /api/v1/recent-searches
router.get("/", async (req, res) => {
  const user = getUser(req);
  if (!user.id) return res.status(401).json({ error: "Unauthorized" });

  try {
    const searches = await JobSearch.find({ userId: user.id })
      .sort({ searchedAt: -1 })
      .limit(10)
      .lean();

    res.json({ data: searches });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recent searches" });
  }
});

// ─── JOB ALERTS ──────────────────────────────────────────────────────────

// GET /api/v1/alerts
router.get("/alerts", async (req, res) => {
  const user = getUser(req);
  if (!user.id) return res.status(401).json({ error: "Unauthorized" });

  try {
    const alerts = await JobAlert.find({ userId: user.id, isActive: true }).lean();
    res.json({ data: alerts });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// POST /api/v1/alerts
router.post(
  "/alerts",
  [body("keywords").isArray({ min: 1 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const user = getUser(req);
    if (!user.id) return res.status(401).json({ error: "Unauthorized" });

    try {
      const alert = await JobAlert.create({
        userId: user.id,
        userEmail: user.email,
        keywords: req.body.keywords,
        country: req.body.country,
        city: req.body.city,
        district: req.body.district,
        workPreference: req.body.workPreference,
        workType: req.body.workType,
      });
      res.status(201).json({ data: alert });
    } catch (err) {
      res.status(500).json({ error: "Failed to create alert" });
    }
  }
);

// DELETE /api/v1/alerts/:id
router.delete("/alerts/:id", async (req, res) => {
  const user = getUser(req);
  if (!user.id) return res.status(401).json({ error: "Unauthorized" });

  try {
    await JobAlert.findOneAndUpdate(
      { _id: req.params.id, userId: user.id },
      { isActive: false }
    );
    res.json({ message: "Alert deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete alert" });
  }
});

module.exports = router;
