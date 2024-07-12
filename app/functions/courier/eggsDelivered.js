const { Markup } = require("telegraf");

module.exports = async (ctx) => {
  const action = ctx.match[0];
  ctx.session.buyers = ctx.session.buyers || [];

  switch (action) {
    case "eggs_delivered_yes":
      await ctx.reply(
        "Nechta tuxum yetkazildi?",
        Markup.inlineKeyboard([
          [
            Markup.button.callback("180", "eggs_amount:180"),
            Markup.button.callback("360", "eggs_amount:360"),
          ],
          [
            Markup.button.callback("540", "eggs_amount:540"),
            Markup.button.callback("720", "eggs_amount:720"),
          ],
          [
            Markup.button.callback("1080", "eggs_amount:1080"),
            Markup.button.callback("1440", "eggs_amount:1440"),
          ],
          [Markup.button.callback("Boshqa", "eggs_other")],
          [Markup.button.callback("Bekor qilish", "cancel")],
        ])
      );
      break;

    case "eggs_delivered_no":
      await ctx.reply(`Siz 0ta tuxum yetkazilganini tanladingiz.`);
      await ctx.reply(
        "Pul olindimi?",
        Markup.inlineKeyboard([
          // [Markup.button.callback("Ha", "payment_received_yes"), Markup.button.callback("Yo’q", "payment_received_no")],
          [
            Markup.button.callback("Ha", "payment_other"),
            Markup.button.callback("Yo’q", "payment_received_no"),
          ],
          [Markup.button.callback("Bekor qilish", "cancel")],
        ])
      );
      break;

    case "eggs_other":
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
    ctx.match[0] = "eggs_other";
    return;
  }

  await ctx.reply(`Siz ${eggsAmount}ta tuxum yetkazilganini tanladingiz.`);
  selectedBuyer.eggsDelivered = eggsAmount;

  // Ask if payment was received
  await ctx.reply(
    "Pul olindimi?",
    Markup.inlineKeyboard([
      // [Markup.button.callback("Ha", "payment_received_yes"), Markup.button.callback("Yo’q", "payment_received_no")],
      [
        Markup.button.callback("Ha", "payment_other"),
        Markup.button.callback("Yo’q", "payment_received_no"),
      ],
      [Markup.button.callback("Bekor qilish", "cancel")],
    ])
  );
}
