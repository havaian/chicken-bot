const addMore = require("../functions/courier/addMore");
const selectCourier = require("../functions/warehouse/selectCourier");
const selectCourierAccepted = require("../functions/warehouse/selectCourierAccepted");
const todayDeliveries = require("../functions/courier/todayDeliveries");
const cancel = require("../functions/general/cancel");
const warehouseStatus = require("../functions/warehouse/warehouseStatus");
const itemIntake = require("../functions/warehouse/itemIntake");
const brokenItems = require("../functions/courier/brokenItems");
const leftItems = require("../functions/courier/leftItems");
const expenses = require("../functions/courier/expenses");
const melange = require("../functions/warehouse/melange");
const remained = require("../functions/warehouse/remained");

const { logger, readLog } = require("../utils/logging");

const commands = {
  "Maxsulot yetkazildi": [addMore, "courier"],
  "Maxsulot chiqimi": [selectCourier.promptCourier, "warehouse"],
  "Qayta yuklash": [selectCourierAccepted.promptCourier, "warehouse"],
  "Hisobot": [todayDeliveries, "courier"],
  "Bekor qilish ❌": [cancel, "all"],
  "Ombor holati": [warehouseStatus, "warehouse"],
  "Maxsulot kirimi": [itemIntake.promptItemImporter, "warehouse"],
  "Kunni yakunlash": [brokenItems.sendBrokenItems, "courier"],
  "Chiqim": [expenses.sendExpenses, "courier"],
  "Singan maxsulot": [melange.promptBroken, "warehouse"],
  // "Qolgan maxsulot": [remained.promptWarehouseRemainedConfirm, "warehouse"],
};

const textCommandHandler = async (ctx, next) => {
  try {
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
  } catch (error) {
    logger.error(error);
  }
};

module.exports = textCommandHandler;
