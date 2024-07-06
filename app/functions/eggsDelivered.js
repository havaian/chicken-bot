const { Markup } = require("telegraf");

module.exports = async (ctx) => {
    const action = ctx.match[0];
    ctx.session.buyers = ctx.session.buyers || [];

    switch (action) {
        case 'eggs_delivered_yes':
            await ctx.reply('Nechta tuxum yetkazildi?', Markup.inlineKeyboard([
                [Markup.button.callback('30', 'eggs_amount:30'), Markup.button.callback('60', 'eggs_amount:60')],
                [Markup.button.callback('90', 'eggs_amount:90'), Markup.button.callback('120', 'eggs_amount:120')],
                [Markup.button.callback('150', 'eggs_amount:150'), Markup.button.callback('180', 'eggs_amount:180')],
                [Markup.button.callback('Boshqa', 'eggs_other')],
                [Markup.button.callback('Bekor qilish', 'cancel')]
            ]));
            break;
        
        case 'eggs_delivered_no':
            await ctx.reply('Pul olindimi?', Markup.inlineKeyboard([
                [Markup.button.callback('Ha', 'payment_received_yes'), Markup.button.callback('Yo\'q', 'payment_received_no')],
                [Markup.button.callback('Bekor qilish', 'cancel')]
            ]));
            break;

        case 'eggs_other':
            ctx.session.awaitingEggsDelivered = true;
            await ctx.reply('Iltimos, qancha tuxum yetkazganingizni kiriting:');
            break;

        default:
            const amount = action.split(':')[1];
            await completeEggsDelivery(ctx, parseInt(amount, 10));
            break;
    }

    // Delete the previous message
    await ctx.deleteMessage();
};

async function completeEggsDelivery(ctx, eggsAmount) {
    const selectedBuyer = ctx.session.buyers[ctx.session.buyers.length - 1];

    await ctx.reply(`Siz ${eggsAmount}ta tuxum yetkazilganini tanladingiz.`);
    selectedBuyer.eggsDelivered = eggsAmount;

    // Ask if payment was received
    await ctx.reply('Pul olindimi?', Markup.inlineKeyboard([
        [Markup.button.callback('Ha', 'payment_received_yes'), Markup.button.callback('Yo\'q', 'payment_received_no')],
        [Markup.button.callback('Bekor qilish', 'cancel')]
    ]));
}

