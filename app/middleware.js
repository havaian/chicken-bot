exports.middleware = async (ctx, next) => {
    // Initialize user session and user data field
    ctx.session = ctx.session || {};
    ctx.session.user = ctx.session.user || {};

    // If user data is not present in session, show a button for user to send contact
    if (Object.keys(ctx.session.user).length === 0 && (ctx.update.message && !ctx.update.message.contact)) {
        await ctx.reply('Please send your contact information.', {
            reply_markup: {
                keyboard: [
                    [{ text: "Send Contact", request_contact: true }]
                ],
                one_time_keyboard: true
            }
        });
    } else {
        // If user data is already present, continue to next middleware
        next();
    }
};