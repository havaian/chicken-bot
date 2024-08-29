const axios = require("../../axios");
const { Markup } = require("telegraf");

const { logger, readLog } = require("../../utils/logging");

const report = require("./report");

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
    
    await report(warehouseActivity, ctx, "Hisobot", false);

    // Show main menu buttons
    await ctx.reply(
      "Tanlang:",
      Markup.keyboard([
        ["Tuxum kirimi", "Tuxum chiqimi"], 
        ["Singan tuxum"], 
        // ["Singan tuxum", "Qolgan tuxum"], 
        ["Ombor holati"]
      ])
    );
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Ombor holatini olishda xatolik yuz berdi. Qayta urunib ko’ring."
    );
  }
};
