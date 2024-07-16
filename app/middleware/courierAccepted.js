const axios = require("../axios");

const courierAccepted = async (ctx, next) => {
  if (((ctx.session.user && ctx.session.user.userType === "courier") && !ctx.session.courierEggsInCar) && !(ctx.hasOwnProperty("update") && ctx.update.hasOwnProperty("callback_query"))) {
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

    if (courierActivity.current <= 0) {
      ctx.reply("Mashinada tuxum yo’q. Ombordan tuxum olishingiz kerak.");
      return;
    }
    
    ctx.session.courierEggsInCar = true;
    next(); 
  } else {
    ctx.session.courierEggsInCar = true;
    next();
  }
};

module.exports = courierAccepted;