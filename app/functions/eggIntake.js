const axios = require("../axios");
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
    const warehouseUserId = ctx.session.user._id;

    try {
        const response = await axios.get(`/warehouse/activity/today`);
        const warehouseActivity = response.data;

        const updatedWarehouseActivity = {
            ...warehouseActivity,
            remained: warehouseActivity.remained + eggsReceived,
            accepted: (warehouseActivity.accepted || 0) + eggsReceived
        };

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity);

        await ctx.reply(`${eggsReceived} tuxum qabul qilindi va qoldiq tuxum miqdoriga qo'shildi.`);
        ctx.session.awaitingEggIntake = false;
    } catch (error) {
        console.log(error);
        await ctx.reply('Tuxum kirimini saqlashda xatolik yuz berdi. Qayta urunib ko\'ring.');
    }
};
