const amqp = require("amqplib");

let connection;
let channel;

const QUEUES = {
  JOB_POSTINGS: "job_postings",
  JOB_APPLICATIONS: "job_applications",
};

const connectQueue = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    for (const queue of Object.values(QUEUES)) {
      await channel.assertQueue(queue, { durable: true });
    }

    connection.on("error", (err) => console.error("RabbitMQ error:", err.message));
    console.log("RabbitMQ connected (notification-service)");
    return channel;
  } catch (err) {
    console.error("RabbitMQ connection failed:", err.message);
  }
};

const consume = async (queue, handler) => {
  if (!channel) return;
  channel.prefetch(1);
  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());
      await handler(data);
      channel.ack(msg);
    } catch (err) {
      console.error(`Error processing message from ${queue}:`, err.message);
      channel.nack(msg, false, false); // Dead-letter
    }
  });
};

module.exports = { connectQueue, consume, QUEUES };
