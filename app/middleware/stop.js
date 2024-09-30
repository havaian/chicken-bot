const { logger, readLog } = require("../utils/logging");

exports.middleware = async (ctx, next) => {
  try {
    await ctx.reply("Hurmatli foydalanuvchi! Tizim o'chib qolishini oldini olish uchun, oylik to'lovni amalga oshiring.");
    return;
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};
