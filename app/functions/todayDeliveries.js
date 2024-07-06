const axios = require("../axios");
const generateHTML = require("./report/generateHTML");
const convertHTMLToImage = require("./report/convertHTMLToImage");
const path = require("path");
const fs = require("fs");

module.exports = async (ctx) => {
    const courierPhoneNum = ctx.session.user.phone_num;
    try {
        // Get today's activity for the courier
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierPhoneNum}`);
        const courierActivity = courierActivityResponse.data;

        // File paths
        const reportDate = new Date().toISOString().split('T')[0];
        const reportDir = path.join('reports', courierPhoneNum, reportDate);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        const htmlFilename = path.join(reportDir, `${courierActivity._id}.html`);
        const imageFilename = path.join(reportDir, `${courierActivity._id}.jpg`);

        // Generate HTML report
        generateHTML(courierActivity, htmlFilename);

        // Convert HTML report to image
        await convertHTMLToImage(htmlFilename, imageFilename);

        // Send image to user
        await ctx.replyWithPhoto({ source: imageFilename });

    } catch (error) {
        console.log(error);
        await ctx.reply('Bugungi yetkazmalarni olishda xatolik yuz berdi. Qayta urunib ko\'ring.');
    }
};
