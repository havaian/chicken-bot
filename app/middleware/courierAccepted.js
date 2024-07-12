const axios = require("../axios");

const courierAccepted = async (ctx, next) => {
  if (ctx.session.user && ctx.session.user.userType === "courier") {
    const response = await axios.get(`/courier/${ctx.session.user.phone_num}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });

    const courier = response.data;

    if (!courier.accepted) {
        ctx.reply("Ishni boshlashdan oldin siz ombordan tuxum olganingizni tasdiqlab olishingiz kerak.");
        return;
    }

    if (courier.current <= 0) {
      ctx.reply("Mashinadagi tuxumlar soni noldan kam. Ombordan tuxum olishingiz kerak.");
      return;
    }
    next();
  }
  next();
};

module.exports = courierAccepted;