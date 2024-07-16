const { Markup } = require("telegraf");

const { logger, readLog } = require("../../utils/logs");

module.exports = async (ctx) => {
  // Reset session
  ctx.session = { user: ctx.session.user };

  ctx.session.awaitingCircleVideoCourier = false;
  ctx.session.awaitingCircleVideoWarehouse = false;
  ctx.session.awaitingCircleVideoWarehouse2 = false;

  ctx.session.awaitingEggsDelivered = false;
  ctx.session.awaitingPaymentAmount = false;
  ctx.session.awaitingExpenses = false;
  ctx.session.awaitingBrokenEggs = false;
  ctx.session.awaitingClientName = false;
  ctx.session.awaitingClientLocation = false;

  ctx.session.awaitingEggIntake = false;
  ctx.session.awaitingDistributedEggs = false;
  ctx.session.awaitingCourierRemainedEggs = false;
  ctx.session.awaitingCourierBrokenEggs = false;

  ctx.session.awaitingWarehouseDailyBroken = false;
  ctx.session.awaitingWarehouseDailyIncision = false;
  ctx.session.awaitingWarehouseDailyIntact = false;
  ctx.session.awaitingWarehouseDailyMelange = false;

  ctx.session.awaitingWarehouseRemained = false;

  let replyMessage;
  let keyboardOptions;

  if (ctx.session.user.userType === "courier") {
    replyMessage = "Bekor qilindi.";
    keyboardOptions = Markup.keyboard([
      ["Tuxum yetkazildi", "Singan tuxumlar"],
      ["Chiqim", "Qolgan tuxumlar"],
      ["Hisobot"]
    ])
      .resize()
      .oneTime();
  } else if (ctx.session.user.userType === "warehouse") {
    replyMessage = "Bekor qilindi.";
    keyboardOptions = Markup.keyboard([["Tuxum kirimi", "Tuxum chiqimi"], ["Singan tuxum", "Qolgan tuxum"], ["Ombor holati"]])
      .resize()
      .oneTime();
  } else {
    replyMessage = "Bekor qilindi.";
  }

  // Send the reply message and show the main menu
  await ctx.reply(replyMessage, keyboardOptions);

  // Delete the previous message
  try {
    await ctx.deleteMessage();
  } catch (error) {
    logger.info("Error deleting message:", error);
  }
};
