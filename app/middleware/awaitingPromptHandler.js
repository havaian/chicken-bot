const expenses = require("../functions/expenses");
const brokenEggs = require("../functions/brokenEggs");
const eggsDelivered = require("../functions/eggsDelivered");
const paymentReceived = require("../functions/paymentReceived");
const eggIntake = require("../functions/eggIntake");

const awaitingPromptHandler = async (ctx, next) => {
    if (ctx.message && ctx.message.text) {
        const text = ctx.message.text;

        if (ctx.session.awaitingEggsDelivered) {
            if (isNaN(text)) {
                await ctx.reply('Iltimos, to\'g\'ri tuxum miqdorini kiriting:');
            } else {
                ctx.session.awaitingEggsDelivered = false;
                ctx.match = [`eggs_amount:${text}`];
                await eggsDelivered(ctx);
            }
        } else if (ctx.session.awaitingPaymentAmount) {
            if (isNaN(text)) {
                await ctx.reply('Iltimos, to\'g\'ri pul miqdorini kiriting:');
            } else {
                ctx.session.awaitingPaymentAmount = false;
                ctx.match = [`payment_amount:${text}`];
                await paymentReceived(ctx);
            }
        } else if (ctx.session.awaitingExpenses) {
            if (isNaN(text)) {
                await ctx.reply('Iltimos, to\'g\'ri chiqim miqdorini kiriting:');
            } else {
                ctx.session.awaitingExpenses = false;
                ctx.match = [`confirm_expenses:${text}`];
                await expenses.confirmExpenses(ctx);
            }
        } else if (ctx.session.awaitingBrokenEggs) {
            if (isNaN(text)) {
                await ctx.reply('Iltimos, to\'g\'ri singan tuxum miqdorini kiriting:');
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
