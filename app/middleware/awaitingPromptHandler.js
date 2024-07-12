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
          "eggs_amount",
          eggsDelivered,
          "awaitingEggsDelivered"
        );
        break;
      case ctx.session.awaitingPaymentAmount:
        await handleNumericInput(
          ctx,
          text,
          "payment_amount",
          paymentReceived,
          "awaitingPaymentAmount"
        );
        break;
      case ctx.session.awaitingExpenses:
        await handleNumericInput(
          ctx,
          text,
          "confirm_expenses",
          expenses.confirmExpenses,
          "awaitingExpenses"
        );
        break;
      case ctx.session.awaitingBrokenEggs:
        await handleNumericInput(
          ctx,
          text,
          "confirm_broken_eggs",
          brokenEggs.confirmBrokenEggs,
          "awaitingBrokenEggs"
        );
        break;
      case ctx.session.awaitingDistributedEggs:
        if (isNaN(text)) {
          await ctx.reply(
            "Iltimos, tarqatilgan tuxum miqdorini to’g’ri kiriting:"
          );
        } else {
          ctx.match = [
            `confirm-distribution:${ctx.session.selectedCourierId}:${text}`,
          ];
          await selectCourier.confirmDistribution(ctx);
          ctx.session.awaitingDistributedEggs = false;
        }
        break;
      case ctx.session.awaitingEggIntake:
        await eggIntake.handleEggIntake(ctx);
        ctx.session.awaitingEggIntake = false;
        break;
      case ctx.session.awaitingClientName:
      case ctx.session.awaitingClientLocation:
        await location(ctx);
        break;
      case ctx.session.awaitingCourierRemainedEggs:
        await selectCourier.courierRemained(ctx);
        break;
      case ctx.session.awaitingCourierBrokenEggs:
        await selectCourier.courierBroken(ctx);
        break;
      default:
        await next();
    }
  } else {
    await next();
  }
};

module.exports = awaitingPromptHandler;
