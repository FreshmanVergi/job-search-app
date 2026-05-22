const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const searchJobsForAI = async (filters = {}) => {
  let q = supabase
    .from("jobs")
    .select("id, title, city, work_type, work_preference, companies(name)")
    .eq("is_active", true)
    .limit(6);

  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.position) q = q.ilike("title", `%${filters.position}%`);

  const { data } = await q;
  return data || [];
};

const generateResponse = (userMessage, jobs) => {
  const msg = userMessage.toLowerCase();

  if (msg.includes("merhaba") || msg.includes("selam")) {
    return "Merhaba! İş arama asistanınızım. Hangi pozisyonu ve şehri arıyorsunuz?";
  }

  if (jobs.length === 0) {
    return "Arama kriterlerinize uygun ilan bulunamadı. Farklı bir şehir veya pozisyon deneyin.";
  }

  const jobList = jobs.slice(0, 3).map(
    (j) => `📌 **${j.title}** - ${j.companies?.name}\n📍 ${j.city} | ${j.work_type} | ${j.work_preference}\n🔗 /jobs/${j.id}`
  ).join("\n\n");

  return `İşte size uygun ilanlar:\n\n${jobList}\n\nBir ilana başvurmak ister misiniz?`;
};

router.post("/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  const lastMessage = messages[messages.length - 1]?.content || "";
  const filters = {};
  const cities = ["istanbul", "izmir", "ankara", "bursa", "antalya"];
  const detected = cities.find((c) => lastMessage.toLowerCase().includes(c));
  if (detected) filters.city = detected;

  try {
    const jobs = await searchJobsForAI(filters);
    const reply = generateResponse(lastMessage, jobs);
    res.json({ message: { role: "assistant", content: reply } });
  } catch (err) {
    res.status(500).json({ error: "AI service unavailable" });
  }
});

module.exports = router;