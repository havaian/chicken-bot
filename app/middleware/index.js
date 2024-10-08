const { logger, readLog } = require("../utils/logging");

exports.middleware = async (ctx, next) => {
  try {
    if (ctx.chat.type != "private") {
      return;
    }
  
    // Initialize user session and user data field
    ctx.session = ctx.session || {};
    ctx.session.user = ctx.session.user || {};
    // If user data is not present in session, show a button for user to send contact
    if (
      Object.keys(ctx.session.user).length === 0 &&
      ((ctx.update && ctx.update.message && !ctx.update.message.contact))
    ) {
      await ctx.reply("Kontaktingizni yuboring.", {
        reply_markup: {
          keyboard: [[{ text: "Yuborish", request_contact: true }]],
          one_time_keyboard: true,
        },
      });
    } else {
      return next();
    }
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};
