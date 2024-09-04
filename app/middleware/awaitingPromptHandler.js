const { Markup } = require("telegraf");
const cancel = require("../functions/general/cancel");
const location = require("../functions/courier/location");
const expenses = require("../functions/courier/expenses");
const leftEggs = require("../functions/courier/leftEggs");
const leftMoney = require("../functions/courier/leftMoney");
const brokenEggs = require("../functions/courier/brokenEggs");
const incision = require("../functions/courier/incision");
const courierMelange = require("../functions/courier/melange");
const eggsDelivered = require("../functions/courier/eggsDelivered");
const paymentReceived = require("../functions/courier/paymentReceived");
const eggIntake = require("../functions/warehouse/eggIntake");
const selectCourier = require("../functions/warehouse/selectCourier");
const selectCourierAccepted = require("../functions/warehouse/selectCourierAccepted");
const melange = require("../functions/warehouse/melange");
const remained = require("../functions/warehouse/remained");

const { logger, readLog } = require("../utils/logging");

const awaitingPromptHandler = async (ctx, next) => {
  try {
    if (ctx.message && ctx.message.text) {
      const text = ctx.message.text;
  
      // Check for "Bekor qilish ❌" command and execute it immediately
      if (text === "Bekor qilish ❌") {
        await cancel(ctx);
        return;
      }
  
      const falseUnhandleList = [
        "awaitingCourierBrokenEggs",
        "awaitingEggsDistributedEggs",
        "awaitingEggsDistributedAcceptedEggs",
        "awaitingCourierRemainedEggs",
        "awaitingCourierMelangeEggs",
        "awaitingBrokenEggs",
        "awaitingIncisionEggs",
        "awaitingMelangeEggs",
        "awaitingLeft",
        "awaitingIntakeEggs",
        "awaitingWarehouseDailyBroken",
        "awaitingWarehouseDailyIncision",
        "awaitingWarehouseDailyIntact",
        "awaitingWarehouseRemained",
        "awaitingWarehouseDailyMelange",
        "awaitingEggsDelivered",
        "awaitingPaymentAmount"
      ]
  
      const handleNumericInput = async (
        ctx,
        text,
        matchPrefix,
        handler,
        sessionKey,
        specialKey
      ) => {
        if (isNaN(text) || parseInt(text, 10) < 0) {
          await ctx.reply("Iltimos, to’g’ri son kiriting:",
            Markup.keyboard([
              ["Bekor qilish ❌"]
            ]));
          return;
        }
        ctx.match = [`${matchPrefix}:${text}:${specialKey}`];
        await handler(ctx);
        if (sessionKey != "awaitingEggsDelivered") {
          ctx.session[sessionKey] = true;
        }
      };
  
      const handleSpecificNumericInput = async (ctx, handler, sessionKey) => {
        const text = ctx.message.text;
        if (isNaN(text) || parseInt(text, 10) < 0) {
          await ctx.reply("Iltimos, to’g’ri son kiriting:",
            Markup.keyboard([
              ["Bekor qilish ❌"]
            ]));
          return;
        }
        await handler(ctx);
        if (!falseUnhandleList.includes(sessionKey)) {
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
            eggsDelivered.deliverEggs,
            "awaitingEggsDelivered",
            ctx.session.categories[ctx.session.currentCategoryIndex]
          );
          break;
        case ctx.session.awaitingPaymentAmount:
          await handleSpecificNumericInput(ctx, paymentReceived.completeTransaction, "awaitingPaymentAmount");
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
        case ctx.session.awaitingMoney:
          await handleSpecificNumericInput(ctx, leftMoney.confirmLeftMoney, "awaitingMoney");
          break;
        case ctx.session.awaitingBrokenEggs:
          await handleSpecificNumericInput(ctx, brokenEggs.sendBrokenEggs, "awaitingBrokenEggs");
          break;
        case ctx.session.awaitingIncisionEggs:
          await handleSpecificNumericInput(ctx, incision.sendIncisionEggs, "awaitingIncisionEggs");
          break;
        case ctx.session.awaitingIntactEggs:
          await handleSpecificNumericInput(ctx, intact.sendIntactEggs, "awaitingIntactEggs");
          break;
        case ctx.session.awaitingMelangeEggs:
          await handleSpecificNumericInput(ctx, courierMelange.sendMelange, "awaitingMelangeEggs");
          break;
        case ctx.session.awaitingLeft:
          await handleSpecificNumericInput(ctx, leftEggs.sendLeft, "awaitingLeft");
          break;
        case ctx.session.awaitingIntakeEggs:
          await handleSpecificNumericInput(ctx, eggIntake.sendIntakeEggs, "awaitingIntakeEggs");
          break;
        case ctx.session.awaitingEggsDistributedEggs:
          await handleSpecificNumericInput(ctx, selectCourier.promptDistribution, "awaitingEggsDistributedEggs");
          break;
        case ctx.session.awaitingEggsDistributedAcceptedEggs:
          await handleSpecificNumericInput(ctx, selectCourierAccepted.promptDistribution, "awaitingEggsDistributedAcceptedEggs");
          break;
        case ctx.session.awaitingCourierRemainedEggs:
          await handleSpecificNumericInput(ctx, selectCourier.promptCourierRemained, "awaitingCourierRemainedEggs");
          break;
        case ctx.session.awaitingCourierMelangeEggs:
          await handleSpecificNumericInput(ctx, selectCourier.promptCourierMelange,  "awaitingCourierMelangeEggs");
          break;
        case ctx.session.awaitingCourierBrokenEggs:
          await handleSpecificNumericInput(ctx, selectCourier.promptCourierBroken, "awaitingCourierBrokenEggs");
          break;
        case ctx.session.awaitingWarehouseDailyBroken:
          await handleSpecificNumericInput(ctx, melange.promptBroken, "awaitingWarehouseDailyBroken");
          break;
        case ctx.session.awaitingWarehouseDailyIncision:
          await handleSpecificNumericInput(ctx, melange.promptIncision, "awaitingWarehouseDailyIncision");
          break;
        case ctx.session.awaitingWarehouseDailyIntact:
          await handleSpecificNumericInput(ctx, melange.promptIntact, "awaitingWarehouseDailyIntact");
          break;
        case ctx.session.awaitingWarehouseDailyMelange:
          await handleSpecificNumericInput(ctx, melange.promptMelange, "awaitingWarehouseDailyMelange");
          break;
        case ctx.session.awaitingWarehouseRemained:
          await handleSpecificNumericInput(ctx, remained.promptWarehouseRemained, "awaitingWarehouseRemained");
          break;
        case ctx.session.awaitingClientName:
          await location.chooseBuyer(ctx);
          break;
        case ctx.session.awaitingClientLocation:
          await location.sendBuyersLocation(ctx);
          break;
        default:
          await next();
      }
    } else {
      await next();
    }
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports = awaitingPromptHandler;
