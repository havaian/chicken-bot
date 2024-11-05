const { logger, readLog } = require("../../utils/logging");

const resetState = (ctx) => {
  try {
    // Preserve only the user information and reset the rest of the session
    const { user } = ctx.session;
    ctx.session = { 
      "user": ctx.session.user, 
      "courierItemsInCar": ctx.session.courierItemsInCar ? ctx.session. ourierItemsInCar : undefined, 
      "currentItems": ctx.session.currentItems ? ctx.session.currentItems : undefined, 
      "dayFinished": ctx.session.dayFinished ? ctx.session.dayFinished : undefined, 
      "awaitingDayFinish": ctx.session.awaitingDayFinish ? ctx.session.awaitingDayFinish : undefined 
    };
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports = resetState;