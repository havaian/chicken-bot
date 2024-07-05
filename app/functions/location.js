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
            await ctx.reply('Siz yuborgan joylashuv bo\'yicha klient topilmadi.');
            return;
        }

        let message = "Klientni tanlang:\n";
        const buttons = buyers.map((buyer, index) => {
            message += `${index + 1}. ${buyer.full_name}\n`;
            return Markup.button.callback(`${index + 1}`, `choose-buyer:${buyer._id}`);
        });

        // Create rows of 5 buttons each
        const buttonRows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            buttonRows.push(buttons.slice(i, i + 5));
        }

        await ctx.reply(message, Markup.inlineKeyboard([
            ...buttonRows,
            [Markup.button.callback('Bekor qilish', 'cancel')]
        ]));
    } catch (error) {
        console.log(error);
        await ctx.reply('Klientlarni topishda xatolik yuz berdi. Qayta urunib ko\'ring');
    }
};
