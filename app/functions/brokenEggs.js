const { Markup } = require("telegraf");
const axios = require("../axios");

exports.sendBrokenEggs = async (ctx) => {
    ctx.session.awaitingBrokenEggs = true;
    await ctx.reply('Nechta tuxum sindi? Iltimos, singan tuxumlar miqdorini yozib yuboring.', Markup.inlineKeyboard([
        [Markup.button.callback('Bekor qilish', 'cancel')]
    ]));
};

exports.confirmBrokenEggs = async (ctx) => {
    if (ctx.session.awaitingBrokenEggs) {
        const amount = parseInt(ctx.message.text, 10);
        if (isNaN(amount) || amount <= 0) {
            await ctx.reply('Noto\'g\'ri qiymat. Iltimos, singan tuxumlar miqdorini yozib yuboring.');
            return;
        }
        ctx.session.brokenEggsAmount = amount;
        await ctx.reply(`Siz ${amount} singan tuxumlar qo'shmoqchimisiz?`, Markup.inlineKeyboard([
            [Markup.button.callback('Tasdiqlash', `confirm_broken_eggs:${amount}`)],
            [Markup.button.callback('Bekor qilish', 'cancel')]
        ]));

        // Delete the previous message
        await ctx.deleteMessage();
        ctx.session.awaitingBrokenEggs = false;
    }
};

exports.addBrokenEggs = async (ctx) => {
    const amount = ctx.session.brokenEggsAmount;
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

        // Clear the session variable
        delete ctx.session.brokenEggsAmount;
    } catch (error) {
        console.log(error);
        await ctx.reply('Singan tuxumlar qo\'shishda xatolik yuz berdi. Qayta urunib ko\'ring');
    }
};
