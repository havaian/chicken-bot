module.exports = async (ctx) => {
    if (Object.keys(ctx.session.user).length === 0) {
        await ctx.reply('Please send your contact information.', {
            reply_markup: {
                keyboard: [
                    [{ text: "Send Contact", request_contact: true }]
                ],
                one_time_keyboard: true
            }
        });
    } else {
        await ctx.reply('Welcome back!');
    }
};