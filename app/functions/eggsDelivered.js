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
                [Markup.button.callback('Bekor qilish', 'cancel')]
            ]));
            break;
        
        case 'eggs_delivered_no':
            await ctx.reply('Pul olindimi?', Markup.inlineKeyboard([
                [Markup.button.callback('Yes', 'payment_received_yes'), Markup.button.callback('No', 'payment_received_no')],
                [Markup.button.callback('Bekor qilish', 'cancel')]
            ]));
            break;

        default:
            const amount = action.split(':')[1];
            await ctx.reply(`You selected ${amount} eggs.`);

            // Save the number of eggs delivered in the session
            ctx.session.buyers[ctx.session.buyers.length - 1].eggsDelivered = parseInt(amount, 10);

            // Ask if payment was received
            await ctx.reply('Pul olindimi?', Markup.inlineKeyboard([
                [Markup.button.callback('Yes', 'payment_received_yes'), Markup.button.callback('No', 'payment_received_no')],
                [Markup.button.callback('Bekor qilish', 'cancel')]
            ]));
            break;
    }
};
