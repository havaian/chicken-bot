const axios = require("../axios");
const { Markup } = require("telegraf");

module.exports = async (ctx) => {
    const { latitude, longitude } = ctx.message.location;

    try {
        const response = await axios.post('/buyer/closest-location', {
            lat: latitude,
            lng: longitude
        });

        const buyers = response.data;
        if (buyers.length === 0) {
            await ctx.reply('No buyers found near this location.');
            return;
        }

        let message = "Klientni tanlang:\n";
        const buttons = buyers.map((buyer, index) => {
            message += `${index + 1}. ${buyer.full_name}\n`;
            return [Markup.button.callback(`${index + 1}`, `choose-buyer:${buyer._id}`)];
        });

        await ctx.reply(message, Markup.inlineKeyboard([
            ...buttons,
            [Markup.button.callback('Bekor qilish', 'cancel')]
        ]));
    } catch (error) {
        console.log(error);
        await ctx.reply('Failed to fetch buyers. Please try again.');
    }
};
