const axios = require("../axios");
const { Markup } = require("telegraf");

module.exports = async (ctx) => {
    const buyerId = ctx.match[1];
    ctx.session.selectedBuyerId = buyerId;

    try {
        const response = await axios.get(`/buyer/${buyerId}`);
        const buyer = response.data;

        ctx.session.buyers = ctx.session.buyers || [];
        ctx.session.buyers.push({
            ...buyer,
            addedAt: new Date(),
            eggsDelivered: 0,
            paymentAmount: 0
        });

        await ctx.reply('Tuxum yetkazildimi?', Markup.inlineKeyboard([
            [Markup.button.callback('Yes', 'eggs_delivered_yes'), Markup.button.callback('No', 'eggs_delivered_no')],
            [Markup.button.callback('Bekor qilish', 'cancel')]
        ]));
    } catch (error) {
        console.log(error);
        await ctx.reply('Failed to select buyer. Please try again.');
    }
};
