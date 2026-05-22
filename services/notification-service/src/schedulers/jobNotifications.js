const cron = require("node-cron");
const mongoose = require("mongoose");
const { createClient } = require("@supabase/supabase-js");
const { sendJobAlertEmail } = require("../lib/mailer");
const ws = require("ws");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } }
);

// Lazy-load models (mongoose must be connected before requiring)
const getModels = () => {
  const JobAlert = require("../models/JobAlert");
  const JobSearch = require("../models/JobSearch");
  return { JobAlert, JobSearch };
};

/**
 * TASK 1: Job Alert Notifications
 * Runs every night at 08:00
 * - Pulls new job postings from queue / DB
 * - Matches against user alerts
 * - Sends email notifications
 */
const runJobAlertNotifications = async () => {
  console.log("[CRON] Running job alert notifications...");
  const { JobAlert } = getModels();

  try {
    // Get jobs posted in the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: newJobs, error } = await supabase
      .from("jobs")
      .select("*, companies(name, logo_url)")
      .eq("is_active", true)
      .gte("created_at", since);

    if (error) throw error;
    if (!newJobs || newJobs.length === 0) {
      console.log("[CRON] No new jobs in last 24h, skipping alerts");
      return;
    }

    console.log(`[CRON] Found ${newJobs.length} new jobs, checking alerts...`);

    // Get all active alerts
    const alerts = await JobAlert.find({ isActive: true }).lean();
    console.log(`[CRON] Processing ${alerts.length} active alerts`);

    const notificationMap = {}; // userId -> { email, matchedJobs }

    for (const alert of alerts) {
      const matchedJobs = newJobs.filter((job) => {
        const titleLower = job.title.toLowerCase();
        const descLower = (job.description || "").toLowerCase();

        const keywordMatch = alert.keywords.some(
          (kw) =>
            titleLower.includes(kw.toLowerCase()) ||
            descLower.includes(kw.toLowerCase())
        );

        const cityMatch = !alert.city || job.city?.toLowerCase().includes(alert.city.toLowerCase());
        const countryMatch = !alert.country || job.country?.toLowerCase() === alert.country.toLowerCase();
        const workPrefMatch = !alert.workPreference || job.work_preference === alert.workPreference;
        const workTypeMatch = !alert.workType || job.work_type === alert.workType;

        return keywordMatch && cityMatch && countryMatch && workPrefMatch && workTypeMatch;
      });

      if (matchedJobs.length > 0) {
        if (!notificationMap[alert.userId]) {
          notificationMap[alert.userId] = {
            email: alert.userEmail,
            jobs: [],
            keywords: alert.keywords,
          };
        }
        // Deduplicate jobs
        const existingIds = new Set(notificationMap[alert.userId].jobs.map((j) => j.id));
        matchedJobs.forEach((j) => {
          if (!existingIds.has(j.id)) notificationMap[alert.userId].jobs.push(j);
        });
      }
    }

    // Send emails
    let sent = 0;
    for (const [userId, { email, jobs, keywords }] of Object.entries(notificationMap)) {
      if (jobs.length > 0) {
        await sendJobAlertEmail(email, jobs, keywords);
        sent++;
        // Update lastNotifiedAt
        await JobAlert.updateMany(
          { userId, isActive: true },
          { lastNotifiedAt: new Date() }
        );
      }
    }

    console.log(`[CRON] Job alert notifications sent to ${sent} users`);
  } catch (err) {
    console.error("[CRON] Job alert error:", err.message);
  }
};

/**
 * TASK 2: Related Job Notifications
 * Runs every night at 09:00
 * - Looks at user search history
 * - Finds related new jobs
 * - Sends personalized recommendations
 */
const runRelatedJobNotifications = async () => {
  console.log("[CRON] Running related job notifications...");
  const { JobSearch } = getModels();
  const { sendRelatedJobsEmail } = require("../lib/mailer");

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    // Get unique users who searched recently
    const recentSearches = await JobSearch.aggregate([
      { $match: { searchedAt: { $gte: since } } },
      {
        $group: {
          _id: "$userId",
          email: { $first: "$userEmail" },
          searches: {
            $push: {
              position: "$query.position",
              city: "$query.city",
            },
          },
        },
      },
    ]);

    // Jobs posted in last 24h
    const jobsSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: newJobs } = await supabase
      .from("jobs")
      .select("*, companies(name, logo_url)")
      .eq("is_active", true)
      .gte("created_at", jobsSince);

    if (!newJobs || newJobs.length === 0) return;

    let sent = 0;
    for (const user of recentSearches) {
      if (!user.email) continue;

      // Find matching jobs based on user's search history
      const matchedJobs = [];
      const seen = new Set();

      for (const search of user.searches) {
        const matching = newJobs.filter((job) => {
          if (seen.has(job.id)) return false;
          const posMatch =
            !search.position ||
            job.title.toLowerCase().includes(search.position.toLowerCase());
          const cityMatch =
            !search.city ||
            job.city?.toLowerCase().includes(search.city.toLowerCase());
          return posMatch && cityMatch;
        });

        matching.slice(0, 3).forEach((j) => {
          seen.add(j.id);
          matchedJobs.push(j);
        });
      }

      if (matchedJobs.length > 0) {
        const topQuery = user.searches[0]?.position || "iş araması";
        await sendRelatedJobsEmail(user.email, matchedJobs.slice(0, 5), topQuery);
        sent++;
      }
    }

    console.log(`[CRON] Related job notifications sent to ${sent} users`);
  } catch (err) {
    console.error("[CRON] Related jobs error:", err.message);
  }
};

// Schedule cron jobs
const startSchedulers = () => {
  // Job alerts: every day at 08:00
  cron.schedule("0 8 * * *", runJobAlertNotifications, {
    timezone: "Europe/Istanbul",
  });

  // Related jobs: every day at 09:00
  cron.schedule("0 9 * * *", runRelatedJobNotifications, {
    timezone: "Europe/Istanbul",
  });

  console.log("[CRON] Schedulers started");
};

module.exports = {
  startSchedulers,
  runJobAlertNotifications,
  runRelatedJobNotifications,
};
