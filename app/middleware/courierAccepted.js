const axios = require("../axios");

const courierAccepted = async (ctx, next) => {
  if ((ctx.session.user && ctx.session.user.userType === "courier")) {
    if (!(ctx.hasOwnProperty("update") && ctx.update.hasOwnProperty("callback_query"))) {
      if ((!ctx.session.courierEggsInCar && !ctx.session.currentEggs && !ctx.session.dayFinished)) {
        const response = await axios.get(`/courier/activity/today/${ctx.session.user.phone_num}`, {
          headers: {
            "x-user-telegram-chat-id": ctx.chat.id,
          },
        });

        const courierActivity = response.data;

        if (!courierActivity.accepted_today) {
          ctx.reply("Ishni boshlashdan oldin siz ombordan tuxum olganingizni tasdiqlab olishingiz kerak.");
          return;
        }

        const current = courierActivity.current;

        if (Object.keys(current).length === 0 || typeof current === "undefined") {
          ctx.reply("Mashinada tuxum yo’q. Ombordan tuxum olishingiz kerak.");
          return;
        }

        ctx.session.courierEggsInCar = true;
        ctx.session.dayFinished = courierActivity.day_finished;
        ctx.session.currentEggs = current;

        return next();
      } else {
        ctx.session.courierEggsInCar = true;
        return next();
      }
    } else {
      return next();
    }
  } else {
    if (!ctx.session.currentEggs || typeof ctx.session.currentEggs === "undefined" || Object.keys(ctx.session.currentEggs).length === 0) {
      const response = await axios.get(`/warehouse/activity/today`, {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      });
  
      const warehouseActivity = response.data;

      ctx.session.currentEggs = warehouseActivity.current;
    }

    return next();
  }
};

module.exports = courierAccepted;