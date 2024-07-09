const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logs");

exports.sendBrokenEggs = async (ctx) => {
    ctx.session.awaitingBrokenEggs = true;
    await ctx.reply('Iltimos, singan tuxumlar miqdorini yozib yuboring.', Markup.inlineKeyboard([
        [Markup.button.callback('Bekor qilish', 'cancel')]
    ]));
};

exports.confirmBrokenEggs = async (ctx) => {
    if (ctx.session.awaitingBrokenEggs) {
        const amount = parseInt(ctx.message.text, 10);
        if (isNaN(amount) || amount <= 0) {
            await ctx.reply('Noto’g’ri qiymat. Iltimos, singan tuxumlar miqdorini yozib yuboring.');
            return;
        }
        ctx.session.brokenEggsAmount = amount;
        await ctx.reply(`Siz ${amount}ta singan tuxum kiritilganini tasdiqlaysizmi?`, Markup.inlineKeyboard([
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
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierPhoneNum}`, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });
        const courierActivity = courierActivityResponse.data;

        // Update courier's activity with broken eggs
        const updatedCourierActivity = {
            ...courierActivity,
            broken: courierActivity.broken + amount
        };

        await axios.put(`/courier/activity/${courierActivity._id}`, updatedCourierActivity, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });

        // Delete the previous message
        await ctx.deleteMessage();

        await ctx.reply(`Sizning hisobingizga ${amount}ta singan tuxum qo’shildi`, Markup.keyboard([
            ['Tuxum yetkazildi', 'Singan tuxumlar'],
            ['Chiqim', 'Bugungi yetkazilganlar']
        ]).resize());

        // Clear the session variable
        delete ctx.session.brokenEggsAmount;
    } catch (error) {
        logger.info(error);
        await ctx.reply('Singan tuxumlar qo’shishda xatolik yuz berdi. Qayta urunib ko’ring');
    }
};
