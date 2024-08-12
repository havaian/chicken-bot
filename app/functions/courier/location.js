const axios = require("../../axios");
const { Markup } = require("telegraf");
const chooseBuyer = require("./chooseBuyer");

const { logger, readLog } = require("../../utils/logging");

module.exports.buyerLocation = async (ctx) => {
  if (ctx.match) {
    // Delete the previous message
    await ctx.deleteMessage();

    ctx.session.match = ctx.match;
    ctx.session.awaitingClientLocation = true;

    await ctx.reply(
      "Geolokatsiyani yuboring.",
      Markup.keyboard([
        [{ text: "Yuborish", request_location: true }],
        ["Bekor qilish"],
      ])
    );
  }
}

module.exports.chooseBuyer = async (ctx) => {
  if (
    ctx.message &&
    ctx.message.text &&
    ctx.session.awaitingClientName
  ) {
    const searchData = { client_name: ctx.message.text };
    const response = await axios.post("/buyer/search", searchData, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });

    const buyers = response.data;
    if (buyers.length === 0) {
      await ctx.reply("Siz yuborgan nom bo’yicha do’kon topilmadi.");
      return;
    }

    let message = "Ro’yxatdan do’konni tanlang:\n";
    const buttons = buyers.map((buyer, index) => {
      message += `${index + 1}. ${buyer.full_name}\n`;
      return Markup.button.callback(
        `${index + 1}`,
        `location-buyer:${buyer._id}`
      );
    });

    // Create rows of 5 buttons each
    const buttonRows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      buttonRows.push(buttons.slice(i, i + 5));
    }

    await ctx.reply(
      message,
      Markup.inlineKeyboard([
        ...buttonRows,
        [Markup.button.callback("Bekor qilish", "cancel")],
      ])
    );

    ctx.session.awaitingClientName = false;
  }
}

module.exports.sendBuyersLocation = async (ctx) => {
  try {
    if (
      ctx.message &&
      ctx.message.location &&
      ctx.session.awaitingClientLocation
    ) {
      if (ctx.message.forward_from) {
        await ctx.reply(
          "Turgan joyingizdan tugma yordamida geolokatsiyani yuboring.",
          Markup.keyboard([
            [{ text: "Yuborish", request_location: true }],
            ["Bekor qilish"],
          ])
            
            
        );
        ctx.session.awaitingClientLocation = true;
        return;
      }

      const { latitude, longitude } = ctx.message.location;
      ctx.session.awaitingClientLocation = true;
      ctx.match = ctx.session.match;

      const buyer = await axios.get(`/buyer/${ctx.match[1]}`, {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      });

      const locations = buyer.data.locations || [];

      const response = await axios.put(
        `/buyer/${ctx.match[1]}`,
        {
          locations: [
            ...locations,
            {
              lat: latitude,
              lng: longitude,
            },
          ],
        },
        {
          headers: {
            "x-user-telegram-chat-id": ctx.chat.id,
          },
        }
      );

      ctx.session.awaitingClientLocation = false;
      chooseBuyer(ctx);
    }
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Ushbu do’kon ro’yxatdan topilmadi. Kiritilgan ma’lutni tekshirib, qaytadan urunib ko’ring.",
      Markup.inlineKeyboard([
        [Markup.button.callback("Bekor qilish", "cancel")],
      ])
    );
  }
};
