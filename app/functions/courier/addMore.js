const axios = require("../../axios");
const { Markup } = require("telegraf");

const { logger, readLog } = require("../../utils/logging");

// module.exports = async (ctx) => {
//     await ctx.reply("Geolokatsiyani yuboring.", Markup.keyboard([
//         [{ text: "Yuborish", request_location: true }],
//         ["Bekor qilish ❌"]
//     ]));
// };

module.exports = async (ctx) => {
  try {
    const response = await axios.get(`/courier/activity/today/${ctx.session.user.phone_num}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });

    const courierActivity = response.data;

    const current = courierActivity.current;

    if (Object.keys(current).length === 0 || typeof current === "undefined") {
      ctx.reply("Mashinada tuxum yo’q. Ombordan tuxum olishingiz kerak.");
      return;
    }

    ctx.session.currentEggs = current;
    
    ctx.session.awaitingClientName = true;
    await ctx.reply("Do’kon nomini kiriting.",
      Markup.keyboard([
        ["Bekor qilish ❌"]
      ]))
  } catch (error) {
    logger.info(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};
