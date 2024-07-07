const axios = require("../../axios");
const { Markup } = require("telegraf");

module.exports = async (ctx) => {
    const contact = ctx.message.contact;
    const userId = ctx.from.id;

    if (contact.user_id !== userId) {
        await ctx.reply('Tugma yordamida o\'zingizni kontaktingizni yuboring');
        return;
    }

    const phoneNumber = contact.phone_number;

    try {
        const response = await axios.get(`/find-by-phone/${phoneNumber}`);
        const user = response.data;

        // Check if telegram_chat_id is present, if not, update the user
        if (!user.telegram_chat_id) {
            user.telegram_chat_id = userId;

            if (user.userType === 'courier') {
                await axios.put(`/courier/${user._id}`, user);
            } else if (user.userType === 'warehouse') {
                await axios.put(`/warehouse/${user._id}`, user);
            }
        }

        ctx.session.user = user;
        
        if (ctx.session.user.userType === 'courier') {
            await ctx.reply('Salom!', Markup.keyboard([
                ['Tuxum yetkazildi', 'Singan tuxumlar'],
                ['Chiqim', 'Bugungi yetkazilganlar']
            ]).resize().oneTime());
        } else if (ctx.session.user.userType === 'warehouse') {
            await ctx.reply('Salom!', Markup.keyboard([
                ['Tuxum kirimi', 'Tuxum chiqimi'],
                ['Ombor holati']
            ]).resize().oneTime());
        }
    } catch (error) {
        console.log(error);
        await ctx.reply('Sizning telegram nomeringiz tizimda topilmadi. Qayta urunib ko\'ring');
    }
};
