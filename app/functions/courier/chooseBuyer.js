const axios = require("../../axios");
const { Markup } = require("telegraf");

const { logger, readLog } = require("../../utils/logging");

const eggsDelivered = require("./eggsDelivered");

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

    ctx.session.buyer = {
      ...buyer,
      addedAt: new Date(),
      eggsDelivered: 0,
      paymentAmount: 0,
    };

    eggsDelivered.deliverEggs(ctx);

    // // Delete the previous message
    // await ctx.deleteMessage();
  } catch (error) {
    logger.info(error);
    await ctx.reply("Klient tanlashda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};
