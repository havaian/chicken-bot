const {
  generateWarehouseHTML,
  generateWarehouseExcel,
} = require("../report/warehouseReport");

const convertHTMLToImage = require("../report/convertHTMLToImage");  

const path = require("path");
const fs = require("fs");
const { logger } = require("../../utils/logging");

module.exports = async(data, ctx, groupId, message, forward = true) => {
  try {
      // File paths
      const reportDate = new Date().toISOString().split("T")[0];
      const reportDir = `reports/warehouse/${reportDate}`;
      if (!fs.existsSync(reportDir)) {
          fs.mkdirSync(reportDir, { recursive: true });
      }

      // Delete old reports
      fs.readdirSync(reportDir).forEach((file) => {
          try {
              fs.unlinkSync(path.join(reportDir, file));
          } catch (error) {
              logger.warn(`Failed to delete file ${file}:`, error);
          }
      });

      const htmlFilename = path.join(reportDir, `${data._id}.html`);
      const imageFilename = path.join(reportDir, `${data._id}.jpg`);
      const excelFilename = path.join(reportDir, `${data._id}.xlsx`);

      // Generate HTML and Excel reports
      try {
          generateWarehouseHTML(data, htmlFilename);
          await generateWarehouseExcel(data, excelFilename);
      } catch (error) {
          logger.error("Error generating warehouse reports:", error);
          throw error; // Re-throw to prevent sending incomplete reports
      }

      // Convert HTML report to image
      try {
          await convertHTMLToImage(htmlFilename, imageFilename);
      } catch (error) {
          logger.error("Error converting HTML to image:", error);
          throw error; // Re-throw to prevent sending incomplete reports
      }

      // Send image to user
      try {
          await ctx.replyWithPhoto({ source: imageFilename });
          // Uncomment the next line if you want to send Excel file as well
          // await ctx.replyWithDocument({ source: excelFilename });
      } catch (error) {
          logger.error("Error sending report to user:", error);
          // Optionally, you can inform the user about the error
          // await ctx.reply("Hisobotni yuborishda xatolik yuz berdi.");
      }

      const caption = `Ombor. ${message}. Xisobot:`;

      // Forward reports to the group
      if (forward) {
          try {
              await ctx.telegram.sendPhoto(
                  groupId,
                  { source: imageFilename },
                  { caption: caption }
              );
          } catch (error) {
              logger.error("Error forwarding report to group:", error);
              // Optionally, you can inform the user about the error
              // await ctx.reply("Guruhga hisobotni yuborishda xatolik yuz berdi.");
          }
      }
  } catch (error) {
      logger.error("Error in warehouse report generation:", error);
      // Optionally, you can inform the user about the error
      // await ctx.reply("Hisobot yaratishda xatolik yuz berdi.");
  }
};