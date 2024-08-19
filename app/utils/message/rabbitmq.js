// rabbitmq.js
const amqp = require('amqplib');

const { logger, readLog } = require("../logging");

let channel = null;

const username=process.env.RABBITMQ_USER;
const password=process.env.RABBITMQ_PASS;
const host=process.env.RABBITMQ_HOST;
const port=process.env.RABBITMQ_PORT;

const connect = async () => {
  try {
    const connection = await amqp.connect(`amqp://${username}:${password}@${host}:${port}/`);
    channel = await connection.createChannel();
    await channel.assertQueue('sms_queue', { durable: true });
    logger.info("RMQ SMS ✅");
  } catch (error) {
    logger.info(error);
  }
}

const sendToQueue = async (queue, message) => {
  try {
    if (!channel) {
      await connect();
    }
    channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
  } catch (error) {
    logger.info(error);
  }
}

process.on('exit', () => {
  try {
    if (channel) {
      channel.close();
    }
  } catch (error) {
    logger.info(error);
  }
});

module.exports = { connect, sendToQueue };
