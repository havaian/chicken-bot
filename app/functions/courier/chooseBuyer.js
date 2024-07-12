const axios = require("../../axios");
const { Markup } = require("telegraf");

const { logger, readLog } = require("../../utils/logs");

module.exports = async (ctx) => {
  const buyerId = ctx.match[1];
  ctx.session.selectedBuyerId = buyerId;

  try {
    const response = await axios.get(`/buyer/${buyerId}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const buyer = response.data;

    ctx.session.buyers = ctx.session.buyers || [];
    ctx.session.buyers.push({
      ...buyer,
      addedAt: new Date(),
      eggsDelivered: 0,
      paymentAmount: 0,
    });

    await ctx.reply(
      "Tuxum yetkazildimi?",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Ha", "eggs_delivered_yes"),
          Markup.button.callback("Yo’q", "eggs_delivered_no"),
        ],
        [Markup.button.callback("Bekor qilish", "cancel")],
      ])
    );

    // // Delete the previous message
    // await ctx.deleteMessage();
  } catch (error) {
    logger.info(error);
    await ctx.reply("Klient tanlashda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};
