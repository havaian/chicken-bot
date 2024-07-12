const location = require("../functions/courier/location");
const expenses = require("../functions/courier/expenses");
const brokenEggs = require("../functions/courier/brokenEggs");
const eggsDelivered = require("../functions/courier/eggsDelivered");
const paymentReceived = require("../functions/courier/paymentReceived");
const eggIntake = require("../functions/warehouse/eggIntake");
const selectCourier = require("../functions/warehouse/selectCourier");

const awaitingPromptHandler = async (ctx, next) => {
  if (ctx.message && ctx.message.text) {
    const text = ctx.message.text;

    const handleNumericInput = async (
      ctx,
      text,
      matchPrefix,
      handler,
      sessionKey
    ) => {
      if (isNaN(text)) {
        if (parseInt(text, 10) < 0) {
          await ctx.reply("Noldan baland bo’lgan tuxum sonini kiriting");
          return;
        }
        await ctx.reply("Iltimos, qiymatni to’g’ri kiriting:");
      } else {
        ctx.match = [`${matchPrefix}:${text}`];
        await handler(ctx);
        ctx.session[sessionKey] = false;
      }
    };

    switch (true) {
      case ctx.session.awaitingEggsDelivered:
        await handleNumericInput(
          ctx,
          text,
          "eggs-amount",
          eggsDelivered,
          "awaitingEggsDelivered"
        );
        break;
      case ctx.session.awaitingPaymentAmount:
        await handleNumericInput(
          ctx,
          text,
          "payment-amount",
          paymentReceived,
          "awaitingPaymentAmount"
        );
        break;
      case ctx.session.awaitingExpenses:
        await handleNumericInput(
          ctx,
          text,
          "confirm-expenses",
          expenses.confirmExpenses,
          "awaitingExpenses"
        );
        break;
      case ctx.session.awaitingBrokenEggs:
        await handleNumericInput(
          ctx,
          text,
          "confirm-broken-eggs",
          brokenEggs.confirmBrokenEggs,
          "awaitingBrokenEggs"
        );
        break;
      case ctx.session.awaitingEggIntake:
        await eggIntake.handleEggIntake(ctx);
        ctx.session.awaitingEggIntake = false;
        break;
      case ctx.session.awaitingClientName:
      case ctx.session.awaitingClientLocation:
        await location(ctx);
        break;
      case ctx.session.awaitingDistributedEggs:
        await selectCourier.confirmDistribution(ctx);
        break;
      case ctx.session.awaitingCourierRemainedEggs:
        await selectCourier.acceptCourierRemained(ctx);
        break;
      case ctx.session.awaitingCourierBrokenEggs:
        await selectCourier.acceptCourierBroken(ctx);
        break;
      default:
        await next();
    }
  } else {
    await next();
  }
};

module.exports = awaitingPromptHandler;
