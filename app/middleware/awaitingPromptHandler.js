const expenses = require("../functions/courier/expenses");
const brokenEggs = require("../functions/courier/brokenEggs");
const eggsDelivered = require("../functions/courier/eggsDelivered");
const paymentReceived = require("../functions/courier/paymentReceived");
const eggIntake = require("../functions/warehouse/eggIntake");

const awaitingPromptHandler = async (ctx, next) => {
    if (ctx.message && ctx.message.text) {
        const text = ctx.message.text;

        if (ctx.session.awaitingEggsDelivered) {
            if (isNaN(text)) {
                await ctx.reply('Iltimos, tuxum miqdorini to\'g\'ri kiriting:');
            } else {
                ctx.session.awaitingEggsDelivered = false;
                ctx.match = [`eggs_amount:${text}`];
                await eggsDelivered(ctx);
            }
        } else if (ctx.session.awaitingPaymentAmount) {
            if (isNaN(text)) {
                await ctx.reply('Iltimos, pul miqdorini to\'g\'ri kiriting:');
            } else {
                ctx.session.awaitingPaymentAmount = false;
                ctx.match = [`payment_amount:${text}`];
                await paymentReceived(ctx);
            }
        } else if (ctx.session.awaitingExpenses) {
            if (isNaN(text)) {
                await ctx.reply('Iltimos, chiqim miqdorini to\'g\'ri kiriting:');
            } else {
                ctx.session.awaitingExpenses = false;
                ctx.match = [`confirm_expenses:${text}`];
                await expenses.confirmExpenses(ctx);
            }
        } else if (ctx.session.awaitingBrokenEggs) {
            if (isNaN(text)) {
                await ctx.reply('Iltimos, singan tuxum miqdorini to\'g\'ri kiriting:');
            } else {
                ctx.session.awaitingBrokenEggs = false;
                ctx.match = [`confirm_broken_eggs:${text}`];
                await brokenEggs.confirmBrokenEggs(ctx);
            }
        } else if (ctx.session.awaitingEggIntake) {
            await eggIntake.handleEggIntake(ctx);
        } else {
            await next();
        }
    } else {
        await next();
    }
};

module.exports = awaitingPromptHandler;
