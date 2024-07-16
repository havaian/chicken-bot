const start = require("../functions/general/start");
const addMore = require("../functions/courier/addMore");
const selectCourier = require("../functions/warehouse/selectCourier");
const todayDeliveries = require("../functions/courier/todayDeliveries");
const cancel = require("../functions/general/cancel");
const warehouseStatus = require("../functions/warehouse/warehouseStatus");
const eggIntake = require("../functions/warehouse/eggIntake");
const brokenEggs = require("../functions/courier/brokenEggs");
const leftEggs = require("../functions/courier/leftEggs");
const expenses = require("../functions/courier/expenses");
const melange = require("../functions/warehouse/melange");
const remained = require("../functions/warehouse/remained");

const commands = {
  start: start,
  "Tuxum yetkazildi": addMore,
  "Tuxum chiqimi": selectCourier.promptCourier,
  "Hisobot": todayDeliveries,
  "Bekor qilish": cancel,
  "Ombor holati": warehouseStatus,
  "Tuxum kirimi": eggIntake.promptEggImporter,
  "Singan tuxumlar": brokenEggs.sendBrokenEggs,
  "Qolgan tuxumlar": leftEggs.sendLeft,
  "Chiqim": expenses.sendExpenses,
  "Singan tuxum": melange.promptBroken,
  "Qolgan tuxum": remained.promptWarehouseRemainedConfirm,
};

const textCommandHandler = async (ctx, next) => {
  if (ctx.message && ctx.message.text) {
    const text = ctx.message.text;
    const commandFunction = commands[text];

    if (commandFunction) {
      await commandFunction(ctx);
    } else {
      await next();
    }
  } else {
    await next();
  }
};

module.exports = textCommandHandler;
