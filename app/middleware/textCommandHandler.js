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

const reset = require("../functions/general/reset");

const commands = {
  "Tuxum yetkazildi": [addMore, "courier"],
  "Tuxum chiqimi": [selectCourier.promptCourier, "warehouse"],
  "Hisobot": [todayDeliveries, "courier"],
  "Bekor qilish": [cancel, "all"],
  "Ombor holati": [warehouseStatus, "warehouse"],
  "Tuxum kirimi": [eggIntake.promptEggImporter, "warehouse"],
  "Kunni yakunlash": [brokenEggs.sendBrokenEggs, "courier"],
  "Chiqim": [expenses.sendExpenses, "courier"],
  "Singan tuxum": [melange.promptBroken, "warehouse"],
  "Qolgan tuxum": [remained.promptWarehouseRemainedConfirm, "warehouse"],
};

const textCommandHandler = async (ctx, next) => {
  if (ctx.message && ctx.message.text) {
    const text = ctx.message.text;
    const command = commands[text];

    if (command) {
      const [commandFunction, allowedUserType] = command;

      if (allowedUserType === "all" || ctx.session.user.userType === allowedUserType) {
        await commandFunction(ctx);
      }
    } else {
      await next();
    }
  } else {
    await next();
  }
};

module.exports = textCommandHandler;
