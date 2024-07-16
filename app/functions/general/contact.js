const axios = require("../../axios");
const { Markup } = require("telegraf");

const { logger, readLog } = require("../../utils/logs");

module.exports = async (ctx) => {
  const contact = ctx.message.contact;
  const userId = ctx.from.id;

  if (contact.user_id !== userId) {
    await ctx.reply("Tugma yordamida o’zingizni kontaktingizni yuboring");
    return;
  }

  const phoneNumber = contact.phone_number;

  try {
    const response = await axios.get(`/find-by-phone/${phoneNumber}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const user = response.data;

    // Check if telegram_chat_id is present, if not, update the user
    if (user.userType === "courier") {
      if (!user.telegram_chat_id) {
        user.telegram_chat_id = userId;
        await axios.put(`/courier/${user._id}`, user, {
          headers: {
            "x-user-telegram-chat-id": ctx.chat.id,
          },
        });
      }
    } else if (user.userType === "warehouse") {
      const userTelegramChatId = user.telegram_chat_id.map(String);
      const userIdStr = String(userId);
      if (!userTelegramChatId.includes(userIdStr)) {
        await axios.put(`/warehouse/${user._id}`, { telegram_chat_id: [...user.telegram_chat_id || [], userId.toString()] }, {
          headers: {
            "x-user-telegram-chat-id": ctx.chat.id,
          },
        });
      }
    }

    ctx.session.user = user;

    if (ctx.session.user.userType === "courier") {
      await ctx.reply(
        "Salom!",
        Markup.keyboard([
          ["Tuxum yetkazildi", "Singan tuxumlar"],
          ["Chiqim", "Qolgan tuxumlar"],
          ["Hisobot"]
        ])
          .resize()
          .oneTime()
      );
    } else if (ctx.session.user.userType === "warehouse") {
      await ctx.reply(
        "Salom!",
        Markup.keyboard([["Tuxum kirimi", "Tuxum chiqimi"], ["Singan tuxum", "Qolgan tuxum"], ["Ombor holati"]])
          .resize()
      );
    }
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Sizning telegram nomeringiz tizimda topilmadi. Qayta urunib ko’ring"
    );
  }
};
