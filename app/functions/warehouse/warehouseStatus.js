const axios = require("../../axios");
const generateWarehouseHTML = require("../report/warehouseReport");
const convertHTMLToImage = require("../report/convertHTMLToImage");
const { Markup } = require("telegraf");
const path = require("path");
const fs = require("fs");

module.exports = async (ctx) => {
    try {
        // Get today's activity for the warehouse
        const warehouseActivityResponse = await axios.get(`/warehouse/activity/today`);
        const warehouseActivity = warehouseActivityResponse.data;

        // Generate HTML report
        const reportDate = new Date().toISOString().split('T')[0];
        const reportDir = `reports/warehouse/${reportDate}`;
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        // Delete old reports
        fs.readdirSync(reportDir).forEach(file => {
            fs.unlinkSync(path.join(reportDir, file));
        });

        const htmlFilename = `${reportDir}/report.html`;
        const imageFilename = `${reportDir}/report.jpg`;

        generateWarehouseHTML(warehouseActivity, htmlFilename);

        // Convert HTML report to image
        await convertHTMLToImage(htmlFilename, imageFilename);

        // Send image to user
        await ctx.replyWithPhoto({ source: imageFilename });

        // Show main menu buttons
        await ctx.reply('Tanlang:', Markup.keyboard([
            ['Tuxum kirimi', 'Tuxum chiqimi'],
            ['Ombor holati']
        ]).resize());

        // Delete the previous message
        await ctx.deleteMessage();
    } catch (error) {
        console.log(error);
        await ctx.reply('Ombor holatini olishda xatolik yuz berdi. Qayta urunib ko\'ring.');
    }
};
