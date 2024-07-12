// rabbitmq.js
const amqp = require('amqplib');

const { logger, readLog } = require("../logs");

let channel = null;

const username=process.env.RABBITMQ_USER;
const password=process.env.RABBITMQ_PASS;
const host=process.env.RABBITMQ_HOST;
const port=process.env.RABBITMQ_PORT;

const connect = async () => {
  const connection = await amqp.connect(`amqp://${username}:${password}@${host}:${port}/`);
  channel = await connection.createChannel();
  await channel.assertQueue('sms_queue', { durable: true });
  logger.info("RMQ SMS ✅");
}

const sendToQueue = async (queue, message) => {
  if (!channel) {
    await connect();
  }
  channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
}

process.on('exit', () => {
  if (channel) {
    channel.close();
  }
});

module.exports = { sendToQueue };
