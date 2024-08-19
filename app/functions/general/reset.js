const { logger, readLog } = require("../../utils/logging");

const resetState = (ctx) => {
  try {
    // Preserve only the user information and reset the rest of the session
    const { user } = ctx.session;
    ctx.session = { user };
  } catch (error) {
    logger.info(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports = resetState;