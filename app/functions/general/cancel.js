const { Markup } = require("telegraf");
const { logger, readLog } = require("../../utils/logs");
const resetState = require("./reset");

module.exports = async (ctx, message = "Bekor qilindi.", showKeyboard = true, deleteMessage = false) => {
  // Reset session state
  resetState(ctx);

  let keyboardOptions;

  if (showKeyboard) {
    if (ctx.session.user.userType === "courier") {
      keyboardOptions = Markup.keyboard([
        ["Tuxum yetkazildi", "Singan tuxumlar"],
        ["Chiqim", "Qolgan tuxumlar"],
        ["Hisobot"]
      ])
        .resize()
        .oneTime();
    } else if (ctx.session.user.userType === "warehouse") {
      keyboardOptions = Markup.keyboard([
        ["Tuxum kirimi", "Tuxum chiqimi"],
        ["Singan tuxum", "Qolgan tuxum"],
        ["Ombor holati"]
      ])
        .resize()
        .oneTime();
    }
  }

  if (deleteMessage) {
    ctx.deleteMessage();
  }

  // Send thereply message and show the main menu
  await ctx.reply(message, keyboardOptions);
};
