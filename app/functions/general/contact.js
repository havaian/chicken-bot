const axios = require("../../axios");
const { Markup } = require("telegraf");

const { logger, readLog } = require("../../utils/logging");

module.exports = async (ctx) => {
  try {
    const contact = ctx.message.contact;
    const userId = ctx.from.id;
  
    if (contact.user_id !== userId) {
      await ctx.reply("Tugma yordamida o’zingizni kontaktingizni yuboring");
      return;
    }
  
    const phoneNumber = contact.phone_number;
    
    const response = await axios.get(`/find-by-phone/${phoneNumber}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const user = response.data;

    let courierData;

    // Check if telegram_chat_id is present, if not, update the user
    if (user.userType === "courier") {
      const response = await axios.get(`/courier/activity/today/${user.phone_num}`, {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      });

      courierData = response.data;

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
      if (courierData.unfinished) {
        await ctx.reply(
          "Kechagi kuningiz tugatilmagan",
          Markup.keyboard([
            ["Kunni yakunlash"]
          ])
        );
        ctx.session.awaitingDayFinish = true;
      } else {
        await ctx.reply(
          "Salom!",
          Markup.keyboard([
            ["Maxsulot yetkazildi", "Kunni yakunlash"],
            ["Chiqim", "Hisobot"]
          ])
        );
      }
    } else if (ctx.session.user.userType === "warehouse") {
      await ctx.reply(
        "Salom!",
        Markup.keyboard([
          ["Maxsulot kirimi", "Maxsulot chiqimi"], 
          ["Singan maxsulot", "Qayta yuklash"],
          // ["Singan maxsulot", "Qolgan maxsulot"], 
          ["Ombor holati"]
        ])
      );
    }
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Sizning telegram nomeringiz tizimda topilmadi. Qayta urunib ko’ring"
    );
  }
};
