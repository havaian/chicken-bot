const { logger, readLog } = require("../utils/logging");

const dayFinished = async (ctx, next) => {
    try {
        // if (ctx.session.dayFinished) {
        //     if (ctx.message && ctx.message.text === "Hisobot") {
        //         return next();
        //     }
        //     await ctx.reply("Siz kunni yakunlagansiz.");
        //     return;
        // }
        return next();
    } catch (error) {
        logger.info(error);
        ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
    }
};

module.exports = dayFinished;