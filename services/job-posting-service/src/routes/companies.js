const express = require("express");
const { body, param, validationResult } = require("express-validator");
const supabase = require("../lib/supabase");
const { cacheGet, cacheSet } = require("../lib/redis");

const router = express.Router();

// GET /api/v1/companies
router.get("/", async (req, res) => {
  const cacheKey = "companies:list";
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name");

    if (error) throw error;
    const result = { data };
    await cacheSet(cacheKey, result, 3600);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

// GET /api/v1/companies/:id
router.get("/:id", [param("id").isUUID()], async (req, res) => {
  const cacheKey = `companies:${req.params.id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { data, error } = await supabase
      .from("companies")
      .select("*, jobs(id, title, city, work_type, is_active)")
      .eq("id", req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: "Company not found" });
    const result = { data };
    await cacheSet(cacheKey, result, 3600);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

// POST /api/v1/companies (admin only - gateway handles auth)
router.post(
  "/",
  [body("name").notEmpty().trim()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { data, error } = await supabase
        .from("companies")
        .insert(req.body)
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ data });
    } catch (err) {
      res.status(500).json({ error: "Failed to create company" });
    }
  }
);

module.exports = router;
