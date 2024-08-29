const { logger, readLog } = require("../../utils/logging");

module.exports = async (ctx) => {
  try {
    if (Object.keys(ctx.session.user).length === 0) {
      await ctx.reply("Kontaktingizni yuboring.", {
        reply_markup: {
          keyboard: [[{ text: "Yuborish", request_contact: true }]],
          one_time_keyboard: true,
        },
      });
    } else {
      await ctx.reply("Salom!");
    }
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};
