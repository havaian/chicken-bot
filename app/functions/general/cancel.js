const { Markup } = require("telegraf");
const { logger, readLog } = require("../../utils/logging");
const resetState = require("./reset");

module.exports = async (ctx, message = "Bekor qilindi.", showKeyboard = true, deleteMessage = false, keyboard) => {
  try {  
    let keyboardOptions;

    if (showKeyboard) {
      if (ctx.session.user.userType === "courier") {
        if (ctx.session.awaitingDayFinish) {
          keyboardOptions = Markup.keyboard([
            ["Kunni yakunlash"]
          ]);
        } else {
          keyboardOptions = Markup.keyboard([
            ["Maxsulot yetkazildi", "Kunni yakunlash"],
            ["Chiqim", "Hisobot"]
          ]);
        }
      } else if (ctx.session.user.userType === "warehouse") {
        keyboardOptions = Markup.keyboard([
          ["Maxsulot kirimi", "Maxsulot chiqimi"],
          ["Singan maxsulot", "Qayta yuklash"],
          // ["Singan maxsulot", "Qolgan maxsulot"],
          ["Ombor holati"]
        ]);
      }
    }

    if (keyboard) {
      keyboardOptions = keyboard;
    }
  
    if (deleteMessage) {
      ctx.deleteMessage();
    }
  
    // Reset session state
    resetState(ctx);
    
    // Send thereply message and show the main menu
    await ctx.reply(message, keyboardOptions);
  } catch (error) {
    logger(error);
  }
};
