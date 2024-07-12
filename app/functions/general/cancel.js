const { Markup } = require("telegraf");

const { logger, readLog } = require("../../utils/logs");

module.exports = async (ctx) => {
    // Reset session
    ctx.session = { user: ctx.session.user };

    ctx.session.awaitingEggsDelivered = false;
    ctx.session.awaitingPaymentAmount = false;
    ctx.session.awaitingExpenses = false;
    ctx.session.awaitingBrokenEggs = false;
    ctx.session.awaitingEggIntake = false;
    ctx.session.awaitingDistributedEggs = false;
    ctx.session.awaitingClientName = false;
    ctx.session.awaitingClientLocation = false;

    let replyMessage;
    let keyboardOptions;

    if (ctx.session.user.userType === 'courier') {
        replyMessage = 'Bekor qilindi.';
        keyboardOptions = Markup.keyboard([
            ['Tuxum yetkazildi', 'Singan tuxumlar'],
            ['Chiqim', 'Hisobot']
        ]).resize().oneTime();
    } else if (ctx.session.user.userType === 'warehouse') {
        replyMessage = 'Bekor qilindi.';
        keyboardOptions = Markup.keyboard([
            ['Tuxum kirimi', 'Tuxum chiqimi'],
            ['Ombor holati']
        ]).resize().oneTime();
    } else {
        replyMessage = 'Bekor qilindi.';
    }

    // Send the reply message and show the main menu
    await ctx.reply(replyMessage, keyboardOptions);

    // Delete the previous message
    try {
        await ctx.deleteMessage();
    } catch (error) {
        logger.info('Error deleting message:', error);
    }
}