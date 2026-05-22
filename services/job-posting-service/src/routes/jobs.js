const express = require("express");
const { body, query, param, validationResult } = require("express-validator");
const supabase = require("../lib/supabase");
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require("../lib/redis");
const { publish, QUEUES } = require("../lib/queue");

const router = express.Router();

// Helper: extract user info from gateway headers
const getUser = (req) => ({
  id: req.headers["x-user-id"],
  email: req.headers["x-user-email"],
  role: req.headers["x-user-role"],
});

// ─── GET /api/v1/jobs ──────────────────────────────────────────────────────
// Public - list jobs with filtering and pagination
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("city").optional().isString(),
    query("country").optional().isString(),
    query("district").optional().isString(),
    query("work_type").optional().isString(),
    query("work_preference").optional().isIn(["on-site", "remote", "hybrid"]),
    query("position_level").optional().isString(),
    query("company_id").optional().isUUID(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const filters = {
      city: req.query.city,
      country: req.query.country,
      district: req.query.district,
      work_type: req.query.work_type,
      work_preference: req.query.work_preference,
      position_level: req.query.position_level,
      company_id: req.query.company_id,
    };

    const cacheKey = `jobs:list:${page}:${limit}:${JSON.stringify(filters)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    try {
      let queryBuilder = supabase
        .from("jobs")
        .select(
          `*, companies(id, name, logo_url)`,
          { count: "exact" }
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (filters.city) queryBuilder = queryBuilder.ilike("city", `%${filters.city}%`);
      if (filters.country) queryBuilder = queryBuilder.ilike("country", `%${filters.country}%`);
      if (filters.district) queryBuilder = queryBuilder.ilike("district", `%${filters.district}%`);
      if (filters.work_type) queryBuilder = queryBuilder.eq("work_type", filters.work_type);
      if (filters.work_preference) queryBuilder = queryBuilder.eq("work_preference", filters.work_preference);
      if (filters.position_level) queryBuilder = queryBuilder.eq("position_level", filters.position_level);
      if (filters.company_id) queryBuilder = queryBuilder.eq("company_id", filters.company_id);

      const { data, error, count } = await queryBuilder;

      if (error) throw error;

      const result = {
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      };

      await cacheSet(cacheKey, result, 300); // 5 min cache
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  }
);

// ─── GET /api/v1/jobs/autocomplete ────────────────────────────────────────
router.get("/autocomplete", async (req, res) => {
  const { q, type } = req.query;
  if (!q || q.length < 2) return res.json({ data: [] });

  const cacheKey = `autocomplete:${type}:${q}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    let result;
    if (type === "city") {
      const { data } = await supabase
        .from("jobs")
        .select("city")
        .ilike("city", `%${q}%`)
        .eq("is_active", true)
        .limit(10);
      const cities = [...new Set(data.map((j) => j.city))].filter(Boolean);
      result = { data: cities };
    } else {
      // Position/title autocomplete
      const { data } = await supabase
        .from("jobs")
        .select("title")
        .ilike("title", `%${q}%`)
        .eq("is_active", true)
        .limit(10);
      const titles = [...new Set(data.map((j) => j.title))].filter(Boolean);
      result = { data: titles };
    }

    await cacheSet(cacheKey, result, 600);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Autocomplete failed" });
  }
});

// ─── GET /api/v1/jobs/:id ─────────────────────────────────────────────────
router.get("/:id", [param("id").isUUID()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const cacheKey = `jobs:detail:${req.params.id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { data, error } = await supabase
      .from("jobs")
      .select("*, companies(id, name, logo_url, website, description)")
      .eq("id", req.params.id)
      .eq("is_active", true)
      .single();

    if (error || !data) return res.status(404).json({ error: "Job not found" });

    // Fetch related jobs
    const { data: related } = await supabase
      .from("jobs")
      .select("id, title, city, work_type, work_preference, companies(name, logo_url), created_at")
      .eq("is_active", true)
      .ilike("title", `%${data.title.split(" ")[0]}%`)
      .neq("id", data.id)
      .limit(3);

    const result = { data, related: related || [] };
    await cacheSet(cacheKey, result, 3600); // 1 hour
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

// ─── POST /api/v1/admin/jobs ──────────────────────────────────────────────
// Admin/Company only - gateway enforces this
router.post(
  "/",
  [
    body("title").notEmpty().trim(),
    body("description").notEmpty(),
   body("company_id").notEmpty(),
    body("work_type").isIn(["full-time", "part-time", "contract", "internship"]),
    body("work_preference").isIn(["on-site", "remote", "hybrid"]),
    body("city").notEmpty().trim(),
    body("country").optional().default("Türkiye"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const user = getUser(req);
    if (!user.id) return res.status(401).json({ error: "Unauthorized" });

    try {
      const jobData = {
        ...req.body,
        posted_by: user.id,
        is_active: true,
      };

      const { data, error } = await supabase
        .from("jobs")
        .insert(jobData)
        .select("*, companies(id, name)")
        .single();

      if (error) throw error;

      // Invalidate list cache
      await cacheDelPattern("jobs:list:*");

      // Publish to queue for notification service
      await publish(QUEUES.JOB_POSTINGS, {
        type: "NEW_JOB",
        job: data,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({ data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create job" });
    }
  }
);

// ─── PUT /api/v1/admin/jobs/:id ───────────────────────────────────────────
router.put("/:id", [param("id").isUUID()], async (req, res) => {
  const user = getUser(req);
  if (!user.id) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { data, error } = await supabase
      .from("jobs")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Job not found" });

    await cacheDel(`jobs:detail:${req.params.id}`);
    await cacheDelPattern("jobs:list:*");

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to update job" });
  }
});

// ─── DELETE /api/v1/admin/jobs/:id ────────────────────────────────────────
router.delete("/:id", [param("id").isUUID()], async (req, res) => {
  try {
    const { error } = await supabase
      .from("jobs")
      .update({ is_active: false })
      .eq("id", req.params.id);

    if (error) throw error;

    await cacheDel(`jobs:detail:${req.params.id}`);
    await cacheDelPattern("jobs:list:*");

    res.json({ message: "Job deactivated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete job" });
  }
});

module.exports = router;
