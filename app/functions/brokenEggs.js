const { Markup } = require("telegraf");
const axios = require("../axios");

module.exports = (bot) => {
    bot.hears('Singan tuxumlar', async (ctx) => {
        await ctx.reply('Nechta tuxum sindi?', Markup.inlineKeyboard([
            [Markup.button.callback('30', 'broken_eggs:30'), Markup.button.callback('60', 'broken_eggs:60')],
            [Markup.button.callback('90', 'broken_eggs:90'), Markup.button.callback('120', 'broken_eggs:120')],
            [Markup.button.callback('150', 'broken_eggs:150'), Markup.button.callback('180', 'broken_eggs:180')],
            [Markup.button.callback('Bekor qilish', 'cancel')]
        ]));

        // Delete the previous message
        await ctx.deleteMessage();
    });

    bot.action(/broken_eggs:\d+/, async (ctx) => {
        const amount = parseInt(ctx.match[0].split(':')[1], 10);
    const courierPhoneNum = ctx.session.user.phone_num;

    try {
        // Get today's activity for the courier
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierPhoneNum}`);
        const courierActivity = courierActivityResponse.data;

        // Update courier's activity with broken eggs
        const updatedCourierActivity = {
            ...courierActivity,
            broken: courierActivity.broken + amount
        };

        await axios.put(`/courier/activity/${courierActivity._id}`, updatedCourierActivity);

        // Delete the previous message
        await ctx.deleteMessage();

        await ctx.reply(`${amount} singan tuxumlar hisobingizga qo'shildi.`, Markup.keyboard([
            ['Tuxum yetkazildi', 'Singan tuxumlar'],
            ['Chiqim', 'Bugungi yetkazilganlar']
        ]).resize());
    } catch (error) {
        console.log(error);
        await ctx.reply('Singan tuxumlar qo\'shishda xatolik yuz berdi. Qayta urunib ko\'ring');
    }
    });
};
