const axios = require("../axios");
const { Markup } = require("telegraf");
const moment = require("moment");

module.exports = async (ctx) => {
    try {
        // Get today's activity for the warehouse
        const warehouseActivityResponse = await axios.get(`/warehouse/activity/today`);
        const warehouseActivity = warehouseActivityResponse.data;

        // Get today's date
        const today = moment().format("YYYY-MM-DD");

        // Create the status report
        let statusReport = `Bugungi Ombor Holati (${today}):\n\n`;
        statusReport += `Omborda qolgan tuxumlar: ${warehouseActivity.remained || 0}\n`;
        statusReport += `Qabul qilingan tuxumlar: ${warehouseActivity.accepted || 0}\n`;
        statusReport += `Singan tuxumlar: ${warehouseActivity.broken || 0}\n`;
        statusReport += `Chiqim: ${warehouseActivity.expenses || 0}\n`;

        await ctx.reply(statusReport, Markup.inlineKeyboard([
            [Markup.button.callback('Bekor qilish', 'cancel')]
        ]));

        // Delete the previous message
        await ctx.deleteMessage();
    } catch (error) {
        console.log(error);
        await ctx.reply('Ombor holatini olishda xatolik yuz berdi. Qayta urunib ko\'ring.');
    }
};
