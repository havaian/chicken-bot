const { Markup } = require("telegraf");

module.exports = async (ctx) => {
    await ctx.reply('Joylashuvni yuboring.', Markup.keyboard([
        [{ text: "Joylashuvni yuborish", request_location: true }],
        ['Bekor qilish']
    ]).resize().oneTime());
};
