const axios = require("../../axios");
const { Markup } = require("telegraf");

module.exports.promptEggIntake = async (ctx) => {
    ctx.session.awaitingEggIntake = true;
    await ctx.reply('Nechta tuxum olindi?', Markup.inlineKeyboard([
        [Markup.button.callback('Bekor qilish', 'cancel')]
    ]));
};

module.exports.handleEggIntake = async (ctx) => {
    if (isNaN(ctx.message.text)) {
        await ctx.reply('Iltimos, to\'g\'ri tuxum miqdorini kiriting:');
        return;
    }

    const eggsReceived = parseInt(ctx.message.text, 10);
    const intakeTime = new Date().toLocaleString();
    ctx.session.eggsReceived = { amount: eggsReceived, time: intakeTime };

    await ctx.reply(`Siz ${eggsReceived} tuxumni ${intakeTime} da qabul qilganingizni tasdiqlaysizmi?`, Markup.inlineKeyboard([
        [Markup.button.callback('Tasdiqlash', 'confirm_egg_intake')],
        [Markup.button.callback('Bekor qilish', 'cancel')]
    ]));
};

module.exports.confirmEggIntake = async (ctx) => {
    const { amount, time } = ctx.session.eggsReceived;

    try {
        const response = await axios.get(`/warehouse/activity/today`);
        const warehouseActivity = response.data;

        // Ensure accepted_at is an array
        const acceptedAtArray = Array.isArray(warehouseActivity.accepted_at) ? warehouseActivity.accepted_at : [];

        const updatedWarehouseActivity = {
            ...warehouseActivity,
            current: warehouseActivity.current + amount,
            accepted: (warehouseActivity.accepted || 0) + amount,
            accepted_at: [...acceptedAtArray, { amount, time }]
        };

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity);

        await ctx.reply(`${amount} tuxum ${time} da qabul qilindi va qoldiq tuxum miqdoriga qo'shildi.`);
        ctx.session.awaitingEggIntake = false;
        ctx.session.eggsReceived = null;
    } catch (error) {
        console.log(error);
        await ctx.reply('Tuxum kirimini saqlashda xatolik yuz berdi. Qayta urunib ko\'ring.');
    }
};

module.exports.cancelEggIntake = async (ctx) => {
    ctx.session.awaitingEggIntake = false;
    ctx.session.eggsReceived = null;
    await ctx.reply('Tuxum kirimi bekor qilindi.');
};
