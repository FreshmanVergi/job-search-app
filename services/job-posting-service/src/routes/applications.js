const express = require("express");
const { body, param, validationResult } = require("express-validator");
const supabase = require("../lib/supabase");
const { publish, QUEUES } = require("../lib/queue");

const router = express.Router();

const getUser = (req) => ({
  id: req.headers["x-user-id"],
  email: req.headers["x-user-email"],
  role: req.headers["x-user-role"],
});

// POST /api/v1/applications - Apply to a job
router.post(
  "/",
  [
    body("job_id").isUUID(),
    body("cover_letter").optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const user = getUser(req);
    if (!user.id) return res.status(401).json({ error: "Unauthorized" });

    try {
      // Check if already applied
      const { data: existing } = await supabase
        .from("applications")
        .select("id")
        .eq("job_id", req.body.job_id)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        return res.status(409).json({ error: "Already applied to this job" });
      }

      const { data, error } = await supabase
        .from("applications")
        .insert({
          job_id: req.body.job_id,
          user_id: user.id,
          user_email: user.email,
          cover_letter: req.body.cover_letter,
        })
        .select()
        .single();

      if (error) throw error;

      // Increment application count
      await supabase.rpc("increment_application_count", { job_id: req.body.job_id });

      // Notify via queue
      await publish(QUEUES.JOB_APPLICATIONS, {
        type: "NEW_APPLICATION",
        application: data,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({ data, message: "Application submitted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to apply" });
    }
  }
);

// GET /api/v1/applications/my - Get user's applications
router.get("/my", async (req, res) => {
  const user = getUser(req);
  if (!user.id) return res.status(401).json({ error: "Unauthorized" });

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const { data, error, count } = await supabase
      .from("applications")
      .select("*, jobs(id, title, city, companies(name, logo_url))", { count: "exact" })
      .eq("user_id", user.id)
      .order("applied_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      data,
      pagination: {
        page, limit, total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

module.exports = router;
