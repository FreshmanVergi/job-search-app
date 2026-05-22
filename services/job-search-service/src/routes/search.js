const express = require("express");
const { query, validationResult } = require("express-validator");
const { createClient } = require("@supabase/supabase-js");
const JobSearch = require("../models/JobSearch");
const { cacheGet, cacheSet } = require("../lib/redis");

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const getUser = (req) => ({
  id: req.headers["x-user-id"],
  email: req.headers["x-user-email"],
});

// ─── GET /api/v1/search ───────────────────────────────────────────────────
router.get(
  "/",
  [
    query("position").optional().isString(),
    query("city").optional().isString(),
    query("country").optional().isString(),
    query("district").optional().isString(),
    query("work_preference").optional().isIn(["on-site", "remote", "hybrid", ""]),
    query("work_type").optional().isString(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      position,
      city,
      country,
      district,
      work_preference,
      work_type,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    try {
      let q = supabase
        .from("jobs")
        .select("*, companies(id, name, logo_url)", { count: "exact" })
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (position) q = q.ilike("title", `%${position}%`);
      if (city) q = q.ilike("city", `%${city}%`);
      if (country) q = q.ilike("country", `%${country}%`);
      if (district) q = q.ilike("district", `%${district}%`);
      if (work_preference) q = q.eq("work_preference", work_preference);
      if (work_type) q = q.eq("work_type", work_type);

      const { data, error, count } = await q;
      if (error) throw error;

      // Save search to MongoDB if user is logged in (non-blocking)
      const user = getUser(req);
      if (user.id && (position || city)) {
        JobSearch.create({
          userId: user.id,
          userEmail: user.email,
          query: { position, city, country, workPreference: work_preference, workType: work_type },
          resultsCount: count,
        }).catch(console.error);
      }

      res.json({
        data,
        filters: { position, city, country, district, work_preference, work_type },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages: Math.ceil(count / limitNum),
          hasNext: pageNum * limitNum < count,
          hasPrev: pageNum > 1,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Search failed" });
    }
  }
);

// ─── GET /api/v1/recent-searches ─────────────────────────────────────────
// Auth required (gateway handles it)
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

module.exports = router;
