const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logs");

exports.sendExpenses = async (ctx) => {
    ctx.session.awaitingExpenses = true;
    await ctx.reply('Nech pul chiqimi? Iltimos, chiqim miqdorini yozib yuboring.', Markup.inlineKeyboard([
        [Markup.button.callback('Bekor qilish', 'cancel')]
    ]));
};

exports.confirmExpenses = async (ctx) => {
    if (ctx.session.awaitingExpenses) {
        const amount = parseInt(ctx.message.text, 10);
        if (isNaN(amount) || amount <= 0) {
            await ctx.reply('Noto\'g\'ri qiymat. Iltimos, chiqim miqdorini yozib yuboring.');
            return;
        }
        ctx.session.expenseAmount = amount;
        await ctx.reply(`Siz ${amount} chiqim qo'shmoqchimisiz?`, Markup.inlineKeyboard([
            [Markup.button.callback('Tasdiqlash', `confirm_expenses:${amount}`)],
            [Markup.button.callback('Bekor qilish', 'cancel')]
        ]));

        // Delete the previous message
        await ctx.deleteMessage();
        ctx.session.awaitingExpenses = false;
    }
};

exports.addExpenses = async (ctx) => {
    const amount = ctx.session.expenseAmount;
    const courierPhoneNum = ctx.session.user.phone_num;

    try {
        // Get today's activity for the courier
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierPhoneNum}`, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });
        const courierActivity = courierActivityResponse.data;

        // Update courier's activity with expenses
        const updatedCourierActivity = {
            ...courierActivity,
            expenses: courierActivity.expenses + amount
        };

        await axios.put(`/courier/activity/${courierActivity._id}`, updatedCourierActivity, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });

        // Delete the previous message
        await ctx.deleteMessage();

        await ctx.reply(`${amount} chiqim hisobingizga qo'shildi.`, Markup.keyboard([
            ['Tuxum yetkazildi', 'Singan tuxumlar'],
            ['Chiqim', 'Bugungi yetkazilganlar']
        ]).resize());

        // Clear the session variable
        delete ctx.session.expenseAmount;
    } catch (error) {
        logger.info(error);
        await ctx.reply('Chiqim qo\'shishda xatolik yuz berdi. Qayta urunib ko\'ring');
    }
};
