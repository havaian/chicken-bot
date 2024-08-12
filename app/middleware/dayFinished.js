const dayFinished = async (ctx, next) => {
    if (ctx.session.dayFinished) {
        if (ctx.message && ctx.message.text === "Hisobot") {
            return next();
        }
        await ctx.reply("Siz kunni yakunlagansiz.");
        return;
    }
    return next();
};

module.exports = dayFinished;