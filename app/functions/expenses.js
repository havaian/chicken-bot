const { Markup } = require("telegraf");
const axios = require("../axios");

module.exports = (bot) => {
    bot.hears('Chiqim', async (ctx) => {
        await ctx.reply('Nech pul chiqimi?', Markup.inlineKeyboard([
            [Markup.button.callback('30', 'expenses:30'), Markup.button.callback('60', 'expenses:60')],
            [Markup.button.callback('90', 'expenses:90'), Markup.button.callback('120', 'expenses:120')],
            [Markup.button.callback('150', 'expenses:150'), Markup.button.callback('180', 'expenses:180')],
            [Markup.button.callback('Bekor qilish', 'cancel')]
        ]));
    });

    bot.action(/expenses:\d+/, async (ctx) => {
        const amount = parseInt(ctx.match[0].split(':')[1], 10);
        const courierPhoneNum = ctx.session.user.phone_num;

        try {
            // Get today's activity for the courier
            const courierActivityResponse = await axios.get(`/courier/activity/today/${courierPhoneNum}`);
            const courierActivity = courierActivityResponse.data;

            // Update courier's activity with expenses
            const updatedCourierActivity = {
                ...courierActivity,
                expenses: courierActivity.expenses + amount
            };

            await axios.put(`/courier/activity/${courierActivity._id}`, updatedCourierActivity);

            await ctx.reply(`Recorded ${amount} expenses.`, Markup.keyboard([
                ['Tuxum yetkazildi', 'Singan tuxumlar'],
                ['Chiqim', 'Bugungi yetkazilganlar']
            ]).resize());
        } catch (error) {
            console.log(error);
            await ctx.reply('Failed to record expenses. Please try again.');
        }
    });
};
