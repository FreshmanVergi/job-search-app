const { consume, QUEUES } = require("../lib/queue");

/**
 * Process new job from queue
 * Triggered when a new job is posted via the admin panel
 * Immediately checks matching alerts and notifies users
 */
const startQueueConsumers = async () => {
  // Consumer for new job postings
  await consume(QUEUES.JOB_POSTINGS, async (message) => {
    if (message.type !== "NEW_JOB") return;

    console.log(`[QUEUE] New job received: ${message.job?.title}`);
    const { JobAlert } = getModels();
    const { sendJobAlertEmail } = require("../lib/mailer");

    const job = message.job;
    const titleLower = job.title.toLowerCase();

    const matchingAlerts = await JobAlert.find({ isActive: true }).lean();

    const notified = new Set();
    for (const alert of matchingAlerts) {
      if (notified.has(alert.userId)) continue;

      const keywordMatch = alert.keywords.some((kw) =>
        titleLower.includes(kw.toLowerCase())
      );
      const cityMatch = !alert.city || job.city?.toLowerCase().includes(alert.city.toLowerCase());

      if (keywordMatch && cityMatch) {
        await sendJobAlertEmail(alert.userEmail, [job], alert.keywords);
        notified.add(alert.userId);
        console.log(`[QUEUE] Alert notification sent to ${alert.userEmail}`);
      }
    }
  });

  // Consumer for new applications (can be used for future features)
  await consume(QUEUES.JOB_APPLICATIONS, async (message) => {
    if (message.type !== "NEW_APPLICATION") return;
    console.log(`[QUEUE] New application received for job: ${message.application?.job_id}`);
    // Future: notify company admin about new application
  });

  console.log("[QUEUE] Consumers started");
};

const getModels = () => {
  return {
    JobAlert: require("../models/JobAlert"),
  };
};

module.exports = { startQueueConsumers };
