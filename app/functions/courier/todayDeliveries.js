const axios = require("../../axios");
const { generateCourierHTML, generateCourierExcel } = require("../report/courierReport");
const convertHTMLToImage = require("../report/convertHTMLToImage");
const { Markup } = require("telegraf");
const path = require("path");
const fs = require("fs");

const { logger, readLog } = require("../../utils/logs");

module.exports = async (ctx) => {
    const courierPhoneNum = ctx.session.user.phone_num;
    try {
        // Get today's activity for the courier
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierPhoneNum}`, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });
        const courierActivity = courierActivityResponse.data;
        
        const courierResponse = await axios.get(`/courier/${courierPhoneNum}`, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });
        const courier = courierResponse.data;
        courierActivity.courier_name = courier.full_name;

        // File paths
        const reportDate = new Date().toISOString().split('T')[0];
        const reportDir = path.join('reports', `courier/${reportDate}`, courierPhoneNum);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        // Delete old reports
        fs.readdirSync(reportDir).forEach(file => {
            fs.unlinkSync(path.join(reportDir, file));
        });

        const htmlFilename = path.join(reportDir, `${courierActivity._id}.html`);
        const imageFilename = path.join(reportDir, `${courierActivity._id}.jpg`);
        const excelFilename = path.join(reportDir, `${courierActivity._id}.xlsx`);

        // Generate HTML and Excel reports
        generateCourierHTML(courierActivity, htmlFilename);
        await generateCourierExcel(courierActivity, excelFilename);

        // Convert HTML report to image
        await convertHTMLToImage(htmlFilename, imageFilename);

        // Send image and Excel file to user
        await ctx.replyWithPhoto({ source: imageFilename });
        await ctx.replyWithDocument({ source: excelFilename });

        // Show main menu buttons
        await ctx.reply('Tanlang:', Markup.keyboard([
            ['Tuxum yetkazildi', 'Singan tuxumlar'],
            ['Chiqim', 'Bugungi yetkazilganlar']
        ]).resize());
    } catch (error) {
        logger.info(error);
        await ctx.reply('Bugungi yetkazmalarni olishda xatolik yuz berdi. Qayta urunib ko\'ring.');
    }
};
