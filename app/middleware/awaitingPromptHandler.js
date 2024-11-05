const { Markup } = require("telegraf");
const cancel = require("../functions/general/cancel");
const location = require("../functions/courier/location");
const expenses = require("../functions/courier/expenses");
const leftItems = require("../functions/courier/leftItems");
const leftMoney = require("../functions/courier/leftMoney");
const brokenItems = require("../functions/courier/brokenItems");
const incision = require("../functions/courier/incision");
const courierMelange = require("../functions/courier/melange");
const itemsDelivered = require("../functions/courier/itemsDelivered");
const paymentReceived = require("../functions/courier/paymentReceived");
const itemIntake = require("../functions/warehouse/itemIntake");
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
        "awaitingCourierBrokenItems",
        "awaitingItemsDistributedItems",
        "awaitingItemsDistributedAcceptedItems",
        "awaitingCourierRemainedItems",
        "awaitingCourierMelangeItems",
        "awaitingBrokenItems",
        "awaitingIncisionItems",
        "awaitingMelangeItems",
        "awaitingLeft",
        "awaitingIntakeItems",
        "awaitingWarehouseDailyBroken",
        "awaitingWarehouseDailyIncision",
        "awaitingWarehouseDailyIntact",
        "awaitingWarehouseRemained",
        "awaitingWarehouseDailyMelange",
        "awaitingItemsDelivered",
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
        if (sessionKey != "awaitingItemsDelivered") {
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
        case ctx.session.awaitingItemsDelivered:
          await handleNumericInput(
            ctx,
            text,
            "items-amount",
            itemsDelivered.deliverItems,
            "awaitingItemsDelivered",
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
        case ctx.session.awaitingBrokenItems:
          await handleSpecificNumericInput(ctx, brokenItems.sendBrokenItems, "awaitingBrokenItems");
          break;
        case ctx.session.awaitingIncisionItems:
          await handleSpecificNumericInput(ctx, incision.sendIncisionItems, "awaitingIncisionItems");
          break;
        case ctx.session.awaitingIntactItems:
          await handleSpecificNumericInput(ctx, intact.sendIntactItems, "awaitingIntactItems");
          break;
        case ctx.session.awaitingMelangeItems:
          await handleSpecificNumericInput(ctx, courierMelange.sendMelange, "awaitingMelangeItems");
          break;
        case ctx.session.awaitingLeft:
          await handleSpecificNumericInput(ctx, leftItems.sendLeft, "awaitingLeft");
          break;
        case ctx.session.awaitingIntakeItems:
          await handleSpecificNumericInput(ctx, itemIntake.sendIntakeItems, "awaitingIntakeItems");
          break;
        case ctx.session.awaitingItemsDistributedItems:
          await handleSpecificNumericInput(ctx, selectCourier.promptDistribution, "awaitingItemsDistributedItems");
          break;
        case ctx.session.awaitingItemsDistributedAcceptedItems:
          await handleSpecificNumericInput(ctx, selectCourierAccepted.promptDistribution, "awaitingItemsDistributedAcceptedItems");
          break;
        case ctx.session.awaitingCourierRemainedItems:
          await handleSpecificNumericInput(ctx, selectCourier.promptCourierRemained, "awaitingCourierRemainedItems");
          break;
        case ctx.session.awaitingCourierMelangeItems:
          await handleSpecificNumericInput(ctx, selectCourier.promptCourierMelange,  "awaitingCourierMelangeItems");
          break;
        case ctx.session.awaitingCourierBrokenItems:
          await handleSpecificNumericInput(ctx, selectCourier.promptCourierBroken, "awaitingCourierBrokenItems");
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
