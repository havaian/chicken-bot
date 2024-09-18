const { generateCourierHTML, generateCourierExcel } = require("../report/courierReport");
const convertHTMLToImage = require("../report/convertHTMLToImage");
const path = require("path");
const fs = require("fs");
const { logger } = require("../../utils/logging");
const groupId = require("../data/groups");

module.exports = async (data, ctx, phone_num, full_name, message, forward = true) => {
  try {
    // Generate timestamp for file names
    const now = new Date();
    
    const dateStamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');

    // File paths
    const reportDate = now.toISOString().split("T")[0];
    const reportDir = path.join("reports", `courier/${reportDate}`, phone_num);
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

    const baseFilename = `${data._id}`;
    const excelFilename = path.join(excelDir, `${full_name}-${dateStamp}.xlsx`);

    // Generate HTML and Excel reports
    const htmlFiles = generateCourierHTML(data, path.join(reportDir, `${baseFilename}.html`));
    if (data.day_finished) {
      await generateCourierExcel(data, excelFilename);
    }

    // Convert HTML reports to images
    const imageFiles = await Promise.all(htmlFiles.map(async (htmlFile) => {
      const imageFile = htmlFile.replace('.html', '.jpg');
      await convertHTMLToImage(htmlFile, imageFile);
      return imageFile;
    }));

    // Send images to user
    if (data.day_finished) {
      // Send all images if day is finished
      for (const imageFile of imageFiles) {
        try {
          await ctx.replyWithPhoto({ source: imageFile });
        } catch (error) {
          logger.error("Error sending report image to user:", error);
        }
      }
    } else {
      // Send only the last image if day is not finished
      try {
        await ctx.replyWithPhoto({ source: imageFiles[imageFiles.length - 1] });
      } catch (error) {
        logger.error("Error sending last report image to user:", error);
      }
    }
    
    const caption = `${full_name}. ${message}`;

    // Forward reports to the group
    if (forward) {
      try {
        if (data.day_finished) {
          // Forward all images if day is finished
          for (const [index, imageFile] of imageFiles.entries()) {
            await ctx.telegram.sendPhoto(
              groupId,
              { source: imageFile },
              { caption: `${caption}. Xisobot: Qism ${index + 1}/${imageFiles.length}` }
            );
          }
        } else {
          // Forward only the last image if day is not finished
          await ctx.telegram.sendPhoto(
            groupId,
            { source: imageFiles[imageFiles.length - 1] },
            { caption: `${caption}. Xisobot` }
          );
        }
        
        if (data.day_finished) {
          await ctx.telegram.sendDocument(
            groupId,
            { source: excelFilename },
            { caption: `Excel:` }
          );
        }
      } catch (error) {
        logger.error("Error forwarding report to group:", error);
      }
    }
  } catch (error) {
    logger.error("Error in courier report generation:", error);
  }
};