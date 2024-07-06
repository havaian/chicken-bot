const { Markup } = require("telegraf");

module.exports = async (ctx) => {
    // Reset session
    ctx.session = { user: ctx.session.user };

    if (ctx.session.user.userType === 'courier') {
        await ctx.reply('Bekor qilindi.', Markup.keyboard([
            ['Tuxum yetkazildi', 'Singan tuxumlar'],
            ['Chiqim', 'Bugungi yetkazilganlar']
        ]).resize().oneTime());

        // Delete the previous message
        await ctx.deleteMessage();
    } else if (ctx.session.user.userType === 'warehouse') {
        await ctx.reply('Bekor qilindi.', Markup.keyboard([
            ['Tuxum chiqimi']
        ]).resize().oneTime());
    }
}