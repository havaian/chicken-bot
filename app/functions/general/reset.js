const { logger, readLog } = require("../../utils/logging");

const resetState = (ctx) => {
  try {
    // Preserve only the user information and reset the rest of the session
    const { user } = ctx.session;
    ctx.session = { 
      "user": ctx.session.user, 
      "courierEggsInCar": ctx.session.courierEggsInCar ? ctx.session. ourierEggsInCar : undefined, 
      "currentEggs": ctx.session.currentEggs ? ctx.session.currentEggs : undefined, 
      "dayFinished": ctx.session.dayFinished ? ctx.session.dayFinished : undefined, 
      "awaitingDayFinish": ctx.session.awaitingDayFinish ? ctx.session.awaitingDayFinish : undefined 
    };
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports = resetState;