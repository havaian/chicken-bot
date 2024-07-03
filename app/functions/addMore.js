const { Markup } = require("telegraf");

module.exports = async (ctx) => {
    await ctx.reply('Joylashuvni yuboring.', Markup.keyboard([
        [{ text: "Share Location", request_location: true }]
    ]).resize().oneTime());
};
