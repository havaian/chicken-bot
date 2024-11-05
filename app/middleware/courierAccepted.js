const axios = require("../axios");
const { Markup } = require("telegraf");

const { logger, readLog } = require("../utils/logging");

const courierAccepted = async (ctx, next) => {
  try {
    if ((ctx.session.user && ctx.session.user.userType === "courier")) {
      if (!(ctx.hasOwnProperty("update") && ctx.update.hasOwnProperty("callback_query"))) {
        if ((
          !ctx.session.courierItemsInCar && 
          !ctx.session.currentItems
        ) || 
        (typeof ctx.session.dayFinished === true &&
        !ctx.session.awaitingDayFinish)) {
          const response = await axios.get(`/courier/activity/today/${ctx.session.user.phone_num}`, {
            headers: {
              "x-user-telegram-chat-id": ctx.chat.id,
            },
          });
  
          const courierActivity = response.data;
  
          if (!courierActivity.accepted_today) {
            await ctx.reply("Ishni boshlashdan oldin siz ombordan maxsulot olganingizni tasdiqlab olishingiz kerak.");
            return;
          }

          if (courierActivity.unfinished && !ctx.session.awaitingDayFinish) {
            ctx.session.awaitingDayFinish = true;
            await ctx.reply(
              "Kechagi kuningiz tugatilmagan",
              Markup.keyboard([
                ["Kunni yakunlash"]
              ])
            );
            return;
          } 
  
          ctx.session.courierItemsInCar = courierActivity.accepted_today;
          return next();
        } else {
          ctx.session.courierItemsInCar = true;
          return next();
        }
      } else {
        return next();
      }
    } else {
      if (!ctx.session.currentItems || typeof ctx.session.currentItems === "undefined" || Object.keys(ctx.session.currentItems).length === 0) {
        const response = await axios.get(`/warehouse/activity/today`, {
          headers: {
            "x-user-telegram-chat-id": ctx.chat.id,
          },
        });
    
        const warehouseActivity = response.data;
  
        ctx.session.currentItems = warehouseActivity.current;
      }
  
      return next();
    }
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports = courierAccepted;