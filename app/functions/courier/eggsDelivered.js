const { Markup } = require("telegraf");

module.exports = async (ctx) => {
  const action = ctx.match[0];
  ctx.session.buyers = ctx.session.buyers || [];

  switch (action) {
    case "eggs-delivered-yes":
      await ctx.reply(
        "Nechta tuxum yetkazildi?",
        Markup.inlineKeyboard([
          [
            Markup.button.callback("180", "eggs-amount:180"),
            Markup.button.callback("360", "eggs-amount:360"),
          ],
          [
            Markup.button.callback("540", "eggs-amount:540"),
            Markup.button.callback("720", "eggs-amount:720"),
          ],
          [
            Markup.button.callback("1080", "eggs-amount:1080"),
            Markup.button.callback("1440", "eggs-amount:1440"),
          ],
          [Markup.button.callback("Boshqa", "eggs-other")],
          [Markup.button.callback("Bekor qilish", "cancel")],
        ])
      );
      break;

    case "eggs-delivered-no":
      await ctx.reply(`Siz 0ta tuxum yetkazilganini tanladingiz.`);
      await ctx.reply(
        "Pul olindimi?",
        Markup.inlineKeyboard([
          // [Markup.button.callback("Ha", "payment-received-yes"), Markup.button.callback("Yo’q", "payment-received-no")],
          [
            Markup.button.callback("Ha", "payment-other"),
            Markup.button.callback("Yo’q", "payment-received-no"),
          ],
          [Markup.button.callback("Bekor qilish", "cancel")],
        ])
      );
      break;

    case "eggs-other":
      ctx.session.awaitingEggsDelivered = true;
      await ctx.reply("Iltimos, qancha tuxum yetkazganingizni kiriting:");
      break;

    default:
      const amount = action.split(":")[1];
      await completeEggsDelivery(ctx, parseInt(amount, 10));
      break;
  }

  // Delete the previous message
  await ctx.deleteMessage();
};

async function completeEggsDelivery(ctx, eggsAmount) {
  const selectedBuyer = ctx.session.buyers[ctx.session.buyers.length - 1];

  if (eggsAmount < 0) {
    await ctx.reply("Noldan baland bo’lgan tuxum sonini kiriting");
    ctx.match[0] = "eggs-other";
    return;
  }

  await ctx.reply(`Siz ${eggsAmount}ta tuxum yetkazilganini tanladingiz.`);
  selectedBuyer.eggsDelivered = eggsAmount;

  // Ask if payment was received
  await ctx.reply(
    "Pul olindimi?",
    Markup.inlineKeyboard([
      // [Markup.button.callback("Ha", "payment-received-yes"), Markup.button.callback("Yo’q", "payment-received-no")],
      [
        Markup.button.callback("Ha", "payment-other"),
        Markup.button.callback("Yo’q", "payment-received-no"),
      ],
      [Markup.button.callback("Bekor qilish", "cancel")],
    ])
  );
}
