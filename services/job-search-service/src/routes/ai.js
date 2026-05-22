const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } }
);

const getUser = (req) => ({
  id: req.headers["x-user-id"],
  email: req.headers["x-user-email"],
});

// Fetch jobs from Supabase for AI context
const searchJobsForAI = async (filters = {}) => {
  let q = supabase
    .from("jobs")
    .select("id, title, city, work_type, work_preference, description, companies(name), requirements")
    .eq("is_active", true)
    .limit(10);

  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.position) q = q.ilike("title", `%${filters.position}%`);

  const { data } = await q;
  return data || [];
};

// POST /api/v1/ai/chat
router.post("/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  const user = getUser(req);

  // Fetch available jobs as context
  let jobs = [];
  try {
    jobs = await searchJobsForAI();
  } catch (err) {
    console.error("Failed to fetch jobs for AI:", err.message);
  }

  const systemPrompt = `You are a helpful job search assistant for a job portal similar to kariyer.net.
You help users find and apply to jobs.

AVAILABLE JOBS IN DATABASE:
${JSON.stringify(jobs, null, 2)}

GUIDELINES:
- Help users search for jobs by position and city
- Show relevant jobs from the database above
- Format job listings clearly with title, company, city, work type
- Ask clarifying questions about preferences (city, work type, experience)
- When user wants to apply, confirm the job details and mention they can click "Başvur" button
- Be friendly and professional
- Respond in the same language the user uses (Turkish or English)
- When showing jobs, include the job id so the frontend can link to detail pages

ACTIONS YOU CAN SUGGEST:
- Search by city and position
- Filter by work type (on-site/remote/hybrid)  
- View job details
- Apply to a job
- Set up job alerts`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const data = await response.json();
    const reply = data.content[0]?.text || "Sorry, I couldn't process that.";

    res.json({
      message: {
        role: "assistant",
        content: reply,
      },
    });
  } catch (err) {
    console.error("AI chat error:", err.message);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

module.exports = router;
