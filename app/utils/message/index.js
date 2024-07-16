// publisher.js
const { connect, sendToQueue } = require('./rabbitmq');

(async () => {
  await connect();
})();

const { logger, readLog } = require("../logs");

const sendSMS = async (phone_number, text) => {
  const queue = 'sms_queue';
  const message = JSON.stringify({
    phone_number: phone_number,
    message: text
  });

  try {
    await sendToQueue(queue, message);
    logger.info("✅ SMS: ", message);
  } catch (error) {
    logger.info('❌ SMS:', error);
  }
};

module.exports = sendSMS;