const axios = require("../axios");
const { Markup } = require("telegraf");

module.exports = async (ctx) => {
    try {
        const response = await axios.get('/courier/all');
        const couriers = response.data;

        if (couriers.length === 0) {
            await ctx.reply('Yo\'q couriers found.');
            return;
        }

        let message = "Kuryerni tanlang:\n";
        const buttons = couriers.map((courier, index) => {
            message += `${index + 1}. ${courier.full_name}\n`;
            return Markup.button.callback(`${index + 1}`, `select-courier:${courier._id}`);
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

        // Delete the previous message
        await ctx.deleteMessage();
    } catch (error) {
        console.log(error);
        await ctx.reply('Failed to fetch couriers. Qayta urunib ko\'ring');
    }
};

module.exports.selectAmount = async (ctx) => {
    const courierId = ctx.match[1];
    ctx.session.selectedCourierId = courierId;

    await ctx.reply('Nechta tuxum berildi?', Markup.inlineKeyboard([
        [Markup.button.callback('30', `confirm-distribution:${courierId}:30`), Markup.button.callback('60', `confirm-distribution:${courierId}:60`)],
        [Markup.button.callback('90', `confirm-distribution:${courierId}:90`), Markup.button.callback('120', `confirm-distribution:${courierId}:120`)],
        [Markup.button.callback('150', `confirm-distribution:${courierId}:150`), Markup.button.callback('180', `confirm-distribution:${courierId}:180`)],
        [Markup.button.callback('Bekor qilish', 'cancel')]
    ]));

    // Delete the previous message
    await ctx.deleteMessage();
};

module.exports.confirmDistribution = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');
    
    await ctx.reply('Tasdiqlaysizmi?', Markup.inlineKeyboard([
        [Markup.button.callback('Tasdiqlash', `accept-distribution:${courierId}:${amount}`)],
        [Markup.button.callback('Bekor qilish', 'cancel')]
    ]));

    // Delete the previous message
    await ctx.deleteMessage();
};

module.exports.acceptDistribution = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');
    const amountInt = parseInt(amount, 10);

    try {
        const courierResponse = await axios.get(`/courier/${courierId}`);
        const courier = courierResponse.data;
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierId}`);
        const courierActivity = courierActivityResponse.data;

        ctx.reply("Xabar kuryerga yetkazildi!");

        // Send message to the courier with inline buttons for accepting or rejecting the distribution
        await ctx.telegram.sendMessage(courier.telegram_chat_id, `Sizning xisobingizga ${amountInt} tuxum qo\'shildi. Iltimos, tasdiqlang.`, Markup.inlineKeyboard([
            [Markup.button.callback('Tasdiqlash', `courier-accept:${courierId}:${amountInt}`)],
            [Markup.button.callback('Rad etish', 'courier-reject')]
        ]));

        // Delete the previous message
        await ctx.deleteMessage();
    } catch (error) {
        console.log(error);
        await ctx.reply('Kuryerga xabar yetkazishda xatolik yuz berdi. Qayta urunib ko\'ring');
    }
};

module.exports.courierAccept = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');
    const amountInt = parseInt(amount, 10);

    try {
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierId}`);
        const courierActivity = courierActivityResponse.data;

        const updatedCourierActivity = {
            ...courierActivity,
            remained: courierActivity.remained + amountInt
        };

        await axios.put(`/courier/activity/${courierActivity._id}`, updatedCourierActivity);

        const warehouseActivityResponse = await axios.get('/warehouse/activity/today');
        const warehouseActivity = warehouseActivityResponse.data;

        const updatedWarehouseActivity = {
            ...warehouseActivity,
            remained: warehouseActivity.remained - amountInt
        };

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity);

        // Delete the previous message
        await ctx.deleteMessage();
        
        await ctx.reply('Tuxum xisobingizga muvaffaqiyatli qo\'shildi va saqlandi.');
    } catch (error) {
        console.log(error);
        await ctx.reply('Tuxum xisobingizga qo\'shishda xatolik yuz berdi. Qayta urunib ko\'ring');
    }
};

module.exports.courierReject = async (ctx) => {
    // Delete the previous message
    await ctx.deleteMessage();

    await ctx.reply('Tuxum xisobga qo\'shish rad etildi.');
};
