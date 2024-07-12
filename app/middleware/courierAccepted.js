const axios = require("../axios");

module.exports = async (ctx, next) => {
  if (ctx.session.user.userType === courier) {
    const response = await axios.get(`/courier/${ctx.session.user.phone_num}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });

    const courier = response.data;

    if (!courier.accepted) {
        ctx.reply("Ishni boshlashdan oldin siz ombordan tuxum olganingizni tasdiqlab olishingiz kerak");
        return;
    }

    next();
  }
};
