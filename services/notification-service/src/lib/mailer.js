const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"Kariyer Bildirim" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err.message);
  }
};

// Job Alert notification email
const sendJobAlertEmail = async (userEmail, jobs, alertKeywords) => {
  const jobListHtml = jobs
    .map(
      (job) => `
      <div style="border:1px solid #eee;padding:12px;margin:8px 0;border-radius:6px;">
        <h3 style="margin:0;color:#6b21a8;">${job.title}</h3>
        <p style="margin:4px 0;color:#666;">${job.companies?.name || "Şirket"} • ${job.city}</p>
        <p style="margin:4px 0;font-size:12px;">${job.work_type} • ${job.work_preference}</p>
        <a href="${process.env.FRONTEND_URL}/jobs/${job.id}" 
           style="color:#6b21a8;font-size:13px;">İlana Git →</a>
      </div>
    `
    )
    .join("");

  await sendEmail({
    to: userEmail,
    subject: `🔔 "${alertKeywords.join(", ")}" için yeni iş ilanları`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#6b21a8;">Yeni İş İlanları</h2>
        <p>Takip ettiğiniz aramalar için <strong>${jobs.length}</strong> yeni ilan bulundu:</p>
        ${jobListHtml}
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee;" />
        <p style="font-size:12px;color:#999;">
          Bildirimleri kapatmak için 
          <a href="${process.env.FRONTEND_URL}/alerts">ayarlarınızı</a> güncelleyin.
        </p>
      </div>
    `,
  });
};

// Related jobs notification email
const sendRelatedJobsEmail = async (userEmail, jobs, searchQuery) => {
  const jobListHtml = jobs
    .map(
      (job) => `
      <div style="border:1px solid #eee;padding:12px;margin:8px 0;border-radius:6px;">
        <h3 style="margin:0;color:#6b21a8;">${job.title}</h3>
        <p style="margin:4px 0;color:#666;">${job.companies?.name || "Şirket"} • ${job.city}</p>
        <a href="${process.env.FRONTEND_URL}/jobs/${job.id}" 
           style="color:#6b21a8;font-size:13px;">İlana Git →</a>
      </div>
    `
    )
    .join("");

  await sendEmail({
    to: userEmail,
    subject: `💼 "${searchQuery}" için önerilen ilanlar`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#6b21a8;">Sizin İçin Önerilen İlanlar</h2>
        <p>Geçmiş aramalarınıza göre ilginizi çekebilecek ilanlar:</p>
        ${jobListHtml}
      </div>
    `,
  });
};

module.exports = { sendEmail, sendJobAlertEmail, sendRelatedJobsEmail };
