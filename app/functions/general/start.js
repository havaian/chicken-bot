module.exports = async (ctx) => {
    if (Object.keys(ctx.session.user).length === 0) {
        await ctx.reply('Kontaktingizni yuboring.', {
            reply_markup: {
                keyboard: [
                    [{ text: "Kontantni yuborish", request_contact: true }]
                ],
                one_time_keyboard: true
            }
        });
    } else {
        await ctx.reply('Salom!');
    }
};