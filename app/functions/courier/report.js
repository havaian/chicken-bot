const {
  generateCourierHTML,
  generateCourierExcel,
} = require("../report/courierReport");

const convertHTMLToImage = require("../report/convertHTMLToImage");  

const path = require("path");
const fs = require("fs");
const { logger } = require("../../utils/logging");

const groupId = require("../data/groups");

module.exports = async(data, ctx, phone_num, full_name, message, forward = true) => {
  try {
      // Generate timestamp for Excel file name
      const now = new Date();
      const timeDateStamp = now.getFullYear().toString() +
                        (now.getMonth() + 1).toString().padStart(2, '0') +
                        now.getDate().toString().padStart(2, '0') + '_' +
                        now.getHours().toString().padStart(2, '0') +
                        now.getMinutes().toString().padStart(2, '0') +
                        now.getSeconds().toString().padStart(2, '0');
             
      const dateStamp = now.getFullYear().toString() +
                      (now.getMonth() + 1).toString().padStart(2, '0') +
                      now.getDate().toString().padStart(2, '0')

      // File paths
      const reportDate = now.toISOString().split("T")[0];
      const reportDir = path.join(
        "reports",
        `courier/${reportDate}`,
        phone_num
      );
      const excelDir = path.join("reports", "courier", "excel", reportDate);

      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      if (!fs.existsSync(excelDir)) {
        fs.mkdirSync(excelDir, { recursive: true });
      }

      // Delete old reports (except Excel)
      fs.readdirSync(reportDir).forEach((file) => {
        fs.unlinkSync(path.join(reportDir, file));
      });

      const htmlFilename = path.join(reportDir, `${full_name}-${timeDateStamp}-${data._id}.html`);
      const imageFilename = path.join(reportDir, `${full_name}-${timeDateStamp}-${data._id}.jpg`);
      const excelFilename = path.join(excelDir, `${full_name}-${dateStamp}.xlsx`);

      console.log('Starting convertHTMLToImage function');
      console.log('HTML Filename:', htmlFilename);
      console.log('Image Filename:', imageFilename);

      // Generate HTML and Excel reports
      generateCourierHTML(data, htmlFilename);
      data.day_finished ? await generateCourierExcel(data, excelFilename) : {};

      // Convert HTML report to image
      await convertHTMLToImage(htmlFilename, imageFilename);

      // Send image and Excel file to user
      try {
          await ctx.replyWithPhoto({ source: imageFilename });
          // await ctx.replyWithDocument({ source: excelFilename });
      } catch (error) {
          logger.error("Error sending report to user:", error);
          // Optionally, you can inform the user about the error
          // await ctx.reply("Hisobotni yuborishda xatolik yuz berdi.");
      }

      const caption = `${full_name}. ${message}`;

      // Forward reports to the group
      if (forward) {
          try {
              await ctx.telegram.sendPhoto(
                  groupId,
                  { source: imageFilename },
                  { caption: `${caption}. Xisobot:` }
              );
              data.day_finished ? await ctx.telegram.sendDocument(
                groupId,
                { source: excelFilename },
                { caption: `Excel:` }
              ) : {};
          } catch (error) {
              logger.error("Error forwarding report to group:", error);
          }
      }
  } catch (error) {
      logger.error("Error in courier report generation:", error);
  }
};