const { Markup } = require("telegraf");

// module.exports = async (ctx) => {
//     await ctx.reply('Joylashuvni yuboring.', Markup.keyboard([
//         [{ text: "Joylashuvni yuborish", request_location: true }],
//         ['Bekor qilish']
//     ]).resize().oneTime());
// };

module.exports = async (ctx) => {
    ctx.session.awaitingClientName = true;
    await ctx.reply('Klient nomini yuboring.');
};
