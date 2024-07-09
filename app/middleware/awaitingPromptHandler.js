const location = require("../functions/courier/location");
const expenses = require("../functions/courier/expenses");
const brokenEggs = require("../functions/courier/brokenEggs");
const eggsDelivered = require("../functions/courier/eggsDelivered");
const paymentReceived = require("../functions/courier/paymentReceived");
const eggIntake = require("../functions/warehouse/eggIntake");
const selectCourier = require("../functions/warehouse/selectCourier");

const awaitingPromptHandler = async (ctx, next) => {
    if (ctx.message && ctx.message.text) {
        const text = ctx.message.text;

        if (ctx.session.awaitingEggsDelivered) {
            if (isNaN(text)) {
                await ctx.reply('Iltimos, tuxum miqdorini to\'g\'ri kiriting:');
            } else {
                ctx.match = [`eggs_amount:${text}`];
                await eggsDelivered(ctx);
                ctx.session.awaitingEggsDelivered = false;
            }
        } else if (ctx.session.awaitingPaymentAmount) {
            if (isNaN(text)) {
                await ctx.reply('Iltimos, pul miqdorini to\'g\'ri kiriting:');
            } else {
                ctx.match = [`payment_amount:${text}`];
                await paymentReceived(ctx);
                ctx.session.awaitingPaymentAmount = false;
            }
        } else if (ctx.session.awaitingExpenses) {
            if (isNaN(text)) {
                await ctx.reply('Iltimos, chiqim miqdorini to\'g\'ri kiriting:');
            } else {
                ctx.match = [`confirm_expenses:${text}`];
                await expenses.confirmExpenses(ctx);
                ctx.session.awaitingExpenses = false;
            }
        } else if (ctx.session.awaitingBrokenEggs) {
            if (isNaN(text)) {
                await ctx.reply('Iltimos, singan tuxum miqdorini to\'g\'ri kiriting:');
            } else {
                ctx.match = [`confirm_broken_eggs:${text}`];
                await brokenEggs.confirmBrokenEggs(ctx);
                ctx.session.awaitingBrokenEggs = false;
            }
        } else if (ctx.session.awaitingDistributedEggs) {
            if (isNaN(text)) {
                await ctx.reply('Iltimos, tarqatilgan tuxum miqdorini to\'g\'ri kiriting:');
            } else {
                ctx.match = [`confirm-distribution:${ctx.session.selectedCourierId}:${text}`];
                await selectCourier.confirmDistribution(ctx);
                ctx.session.awaitingDistributedEggs = false;
            }
        } else if (ctx.session.awaitingEggIntake) {
            await eggIntake.handleEggIntake(ctx);
            ctx.session.awaitingEggIntake = false;
        } else if (ctx.session.awaitingClientName) {
            await location(ctx);
            ctx.session.awaitingClientName = false;
        } else {
            await next();
        }
    } else {
        await next();
    }
};

module.exports = awaitingPromptHandler;
