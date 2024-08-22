const {
    generateCourierHTML,
    generateCourierExcel,
} = require("../report/courierReport");

const convertHTMLToImage = require("../report/convertHTMLToImage");  
  
const path = require("path");
const fs = require("fs");

module.exports = async(data, ctx, groupId, phone_num, full_name, message, forward = true) => {
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

    // Send image and Excel file to user
    await ctx.replyWithPhoto({ source: imageFilename });
    // await ctx.replyWithDocument({ source: excelFilename });

    const caption = `${full_name}. ${message}. Xisobot:`;

    // // Forward reports to the group
    // forward ? await ctx.telegram.sendDocument(
    //   groupId,
    //   { source: excelFilename },
    //   { caption: caption }
    // ) : {};
    // Forward reports to the group
    forward ? await ctx.telegram.sendPhoto(
      groupId,
      { source: imageFilename },
      { caption: caption }
    ) : {};
}