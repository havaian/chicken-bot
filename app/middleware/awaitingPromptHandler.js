const location = require("../functions/courier/location");
const expenses = require("../functions/courier/expenses");
const leftEggs = require("../functions/courier/leftEggs");
const brokenEggs = require("../functions/courier/brokenEggs");
const eggsDelivered = require("../functions/courier/eggsDelivered");
const paymentReceived = require("../functions/courier/paymentReceived");
const eggIntake = require("../functions/warehouse/eggIntake");
const selectCourier = require("../functions/warehouse/selectCourier");
const melange = require("../functions/warehouse/melange");
const remained = require("../functions/warehouse/remained");

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
      case ctx.session.awaitingCircleVideoCourier:
        await paymentReceived.handleCircleVideo(ctx);
        break;
      case ctx.session.awaitingCircleVideoWarehouse:
        await selectCourier.handleCircleVideo(ctx);
        break;
      case ctx.session.awaitingCircleVideoWarehouse2:
        await remained.handleCircleVideo(ctx);
        break;
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
      case ctx.session.awaitingLeft:
        await handleNumericInput(
          ctx,
          text,
          "confirm-left",
          leftEggs.confirmLeft,
          "awaitingLeft"
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
        await selectCourier.acceptDistribution(ctx);
        break;
      case ctx.session.awaitingCourierRemainedEggs:
        await selectCourier.acceptCourierRemained(ctx);
        break;
      case ctx.session.awaitingCourierBrokenEggs:
        await selectCourier.acceptCourierBroken(ctx);
        break;
      case ctx.session.awaitingWarehouseDailyBroken: 
        await melange.acceptBroken(ctx);
        break;
      case ctx.session.awaitingWarehouseDailyIncision: 
        await melange.acceptIncision(ctx);
        break;
      case ctx.session.awaitingWarehouseDailyIntact: 
        await melange.acceptIntact(ctx);
        break;
      case ctx.session.awaitingWarehouseDailyMelange: 
        await melange.acceptMelange(ctx);
        break;
      case ctx.session.awaitingWarehouseRemained: 
        await remained.acceptWarehouseDeficit(ctx);
        break;
      default:
        await next();
    }
  } else {
    await next();
  }
};

module.exports = awaitingPromptHandler;
