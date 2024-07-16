const { Markup } = require("telegraf");

// module.exports = async (ctx) => {
//     await ctx.reply("Geolokatsiyani yuboring.", Markup.keyboard([
//         [{ text: "Yuborish", request_location: true }],
//         ["Bekor qilish"]
//     ]).resize().oneTime());
// };

module.exports = async (ctx) => {
  ctx.session.awaitingClientName = true;
  await ctx.reply("Do’kon nomini kiriting.",
    Markup.keyboard([
      ["Bekor qilish"]
    ]).resize().oneTime());
};
