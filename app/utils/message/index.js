// publisher.js
const { connect, sendToQueue } = require('./rabbitmq');

(async () => {
  await connect();
})();

const { logger, readLog } = require("../logging");

const sendSMS = async (phone_number, text) => {
  try {
    const queue = 'sms_queue';
    const message = JSON.stringify({
      phone_number: phone_number,
      message: text
    });
    
    await sendToQueue(queue, message);
    logger.info("✅ SMS: ", message);
  } catch (error) {
    logger.info('❌ SMS:', error);
  }
};

module.exports = sendSMS;