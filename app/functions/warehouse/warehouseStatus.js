const axios = require("../../axios");
const {
  generateWarehouseHTML,
  generateWarehouseExcel,
} = require("../report/warehouseReport");
const convertHTMLToImage = require("../report/convertHTMLToImage");
const { Markup } = require("telegraf");
const path = require("path");
const fs = require("fs");

const { logger, readLog } = require("../../utils/logs");

module.exports = async (ctx) => {
  try {
    // Get today's activity for the warehouse
    const warehouseActivityResponse = await axios.get(
      `/warehouse/activity/today`,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );
    const warehouseActivity = warehouseActivityResponse.data;

    // Generate HTML report
    const reportDate = new Date().toISOString().split("T")[0];
    const reportDir = `reports/warehouse/${reportDate}`;
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Delete old reports
    fs.readdirSync(reportDir).forEach((file) => {
      fs.unlinkSync(path.join(reportDir, file));
    });

    const htmlFilename = `${reportDir}/${warehouseActivity._id}.html`;
    const imageFilename = `${reportDir}/${warehouseActivity._id}.jpg`;
    const excelFilename = `${reportDir}/${warehouseActivity._id}.xlsx`;

    generateWarehouseHTML(warehouseActivity, htmlFilename);
    await generateWarehouseExcel(warehouseActivity, excelFilename);

    // Convert HTML report to image
    await convertHTMLToImage(htmlFilename, imageFilename);

    // Send image and Excel file to user
    await ctx.replyWithPhoto({ source: imageFilename });
    await ctx.replyWithDocument({ source: excelFilename });

    // Show main menu buttons
    await ctx.reply(
      "Tanlang:",
      Markup.keyboard([["Tuxum kirimi", "Tuxum chiqimi"], ["Singan tuxumlar", "Qolgan tuxum"], ["Ombor holati"]]).resize()
    );
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Ombor holatini olishda xatolik yuz berdi. Qayta urunib ko’ring."
    );
  }
};
