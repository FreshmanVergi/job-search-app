const amqp = require("amqplib");

let channel;

const QUEUES = {
  JOB_POSTINGS: "job_postings",
  JOB_APPLICATIONS: "job_applications",
};

const connectQueue = async () => {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await conn.createChannel();

    // Assert all queues durable
    for (const queue of Object.values(QUEUES)) {
      await channel.assertQueue(queue, { durable: true });
    }

    conn.on("error", (err) => console.error("RabbitMQ error:", err.message));
    conn.on("close", () => console.log("RabbitMQ connection closed"));

    console.log("RabbitMQ connected");
  } catch (err) {
    console.error("RabbitMQ connection failed:", err.message);
    // Non-fatal - service still works without queue
  }
};

const publish = async (queue, message) => {
  if (!channel) {
    console.warn("Queue not available, skipping publish");
    return;
  }
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
};

module.exports = { connectQueue, publish, QUEUES };
