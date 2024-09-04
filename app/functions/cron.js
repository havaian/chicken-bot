const cron = require('node-cron');
const axios = require('../axios');

const { generateCourierHTML, generateCourierExcel } = require("./report/courierReport");
const convertHTMLToImage = require("./report/convertHTMLToImage");

const path = require("path");
const fs = require("fs");

const { logger } = require("../utils/logging");
const groupId = require("./data/groups");

let botInstance = null;

const setBotInstance = (bot) => {
  botInstance = bot;
};

const report = async (data, phone_num, full_name, message, forward = true) => {
  try {
    // File paths
    const reportDate = new Date().toISOString().split("T")[0];
    const reportDir = path.join(
      "reports",
      `courier/${reportDate}`,
      phone_num
    );
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Delete old reports
    fs.readdirSync(reportDir).forEach((file) => {
      fs.unlinkSync(path.join(reportDir, file));
    });

    const htmlFilename = path.join(reportDir, `${data._id}.html`);
    const imageFilename = path.join(reportDir, `${data._id}.jpg`);
    const excelFilename = path.join(reportDir, `${data._id}.xlsx`);

    // Generate HTML and Excel reports
    generateCourierHTML(data, htmlFilename);
    await generateCourierExcel(data, excelFilename);

    // Convert HTML report to image
    await convertHTMLToImage(htmlFilename, imageFilename);

    const caption = `${full_name}. ${message}. Xisobot:`;

    // Forward reports to the group
    if (forward) {
      try {
        await botInstance.telegram.sendPhoto(
          groupId,
          { source: imageFilename },
          { caption: caption }
        );
      } catch (error) {
        logger.error("Error forwarding report to group:", error);
      }
    }
  } catch (error) {
    logger.error("Error in courier report generation:", error);
  }
};

// Main function to process couriers and generate reports
const processCouriersAndGenerateReports = async () => {
  try {
    // Get today's unfinished activities
    const couriersActivitiesResponse = await axios.get(`/courier/activity/today/accepted-unfinished`, {
      headers: { "x-user-telegram-chat-id": "cron-job" },
    });
    const activities = couriersActivitiesResponse.data;

    for (const activity of activities) {
      const courierId = activity.courier;

      // Get courier details
      const courierResponse = await axios.get(`/courier/${courierId}`, {
        headers: { "x-user-telegram-chat-id": "cron-job" },
      });
      const courier = courierResponse.data;

      const full_name = `${courier.full_name} ${courier.car_num ? "(" + courier.car_num + ")" : ""}`;

      // Initialize new fields
      const newIncision = { D1: 0, D2: 0, UP: 0 };
      const newCurrentByCourier = { D1: 0, D2: 0, UP: 0 };
      const newMelangeByCourier = { D1: 0, D2: 0, UP: 0 };

      // Update fields based on current values
      Object.entries(activity.current).forEach(([category, value]) => {
        if (value !== 0) {
          newIncision[category] = 0;
          newCurrentByCourier[category] = 0;
          newMelangeByCourier[category] = 0;
        }
      });

      // Update activity data
      const updatedCourierActivity = {
        ...activity,
        incision: newIncision,
        current_by_courier: newCurrentByCourier,
        melange_by_courier: newMelangeByCourier,
        money_by_courier: 0,
        day_finished: true
      };

      // Update activity in the database
      await axios.put(`/courier/activity/${activity._id}`, updatedCourierActivity, {
        headers: { "x-user-telegram-chat-id": "cron-job" },
      });

      // Generate and send report
      await report(updatedCourierActivity, courier.phone_num, full_name, "Kun tugatildi", true);
    }
  } catch (error) {
    logger.error("Error processing couriers and generating reports:", error);
  }
}

// Schedule the cron job to run at 5:59 UTC+5 every day
cron.schedule('59 5 * * *', async () => {
// cron.schedule('59 * * * *', async () => {
// cron.schedule('* * * * *', async () => {
  processCouriersAndGenerateReports();
}, {
  scheduled: true,
  timezone: "Asia/Tashkent" // Adjust timezone as needed
});

logger.info('Courier day auto-finish cron job ✅');

module.exports.setBotInstance = setBotInstance;