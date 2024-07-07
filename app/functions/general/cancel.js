const { Markup } = require("telegraf");

module.exports = async (ctx) => {
    // Reset session
    ctx.session = { user: ctx.session.user };

    ctx.session.awaitingEggsDelivered = false;
    ctx.session.awaitingPaymentAmount = false;
    ctx.session.awaitingExpenses = false;
    ctx.session.awaitingBrokenEggs = false;
    ctx.session.awaitingEggIntake = false;

    let replyMessage;
    let keyboardOptions;

    if (ctx.session.user.userType === 'courier') {
        replyMessage = 'Bekor qilindi.';
        keyboardOptions = Markup.keyboard([
            ['Tuxum yetkazildi', 'Singan tuxumlar'],
            ['Chiqim', 'Bugungi yetkazilganlar']
        ]).resize().oneTime();
    } else if (ctx.session.user.userType === 'warehouse') {
        replyMessage = 'Bekor qilindi.';
        keyboardOptions = Markup.keyboard([
            ['Tuxum kirimi', 'Tuxum chiqimi'],
            ['Ombor holati']
        ]).resize().oneTime();
    }

    // Send the reply message and show the main menu
    await ctx.reply(replyMessage, keyboardOptions);

    // Delete the previous message
    try {
        await ctx.deleteMessage();
    } catch (error) {
        console.log('Error deleting message:', error);
    }
}