const { Markup } = require("telegraf");
const { logger, readLog } = require("../../utils/logging");
const resetState = require("./reset");

module.exports = async (ctx, message = "Bekor qilindi.", showKeyboard = true, deleteMessage = false) => {
  try {
    // Reset session state
    resetState(ctx);
  
    let keyboardOptions;
  
    if (showKeyboard) {
      if (ctx.session.user.userType === "courier") {
        keyboardOptions = Markup.keyboard([
          ["Tuxum yetkazildi", "Kunni yakunlash"],
          ["Chiqim", "Hisobot"]
        ])
          
          ;
      } else if (ctx.session.user.userType === "warehouse") {
        keyboardOptions = Markup.keyboard([
          ["Tuxum kirimi", "Tuxum chiqimi"],
          ["Singan tuxum", "Qayta yuklash"],
          // ["Singan tuxum", "Qolgan tuxum"],
          ["Ombor holati"]
        ])
          
          ;
      }
    }
  
    if (deleteMessage) {
      ctx.deleteMessage();
    }
  
    // Send thereply message and show the main menu
    await ctx.reply(message, keyboardOptions);
  } catch (error) {
    logger(error);
  }
};
