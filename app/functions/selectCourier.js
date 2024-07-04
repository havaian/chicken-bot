const axios = require("../axios");
const { Markup } = require("telegraf");

module.exports = async (ctx) => {
    try {
        const response = await axios.get('/courier/all');
        const couriers = response.data;

        if (couriers.length === 0) {
            await ctx.reply('No couriers found.');
            return;
        }

        let message = "Kuryerni tanlang:\n";
        const buttons = couriers.map((courier, index) => {
            message += `${index + 1}. ${courier.full_name}\n`;
            return [Markup.button.callback(`${index + 1}`, `select-courier:${courier._id}`)];
        });

        await ctx.reply(message, Markup.inlineKeyboard([
            ...buttons,
            [Markup.button.callback('Bekor qilish', 'cancel')]
        ]));
    } catch (error) {
        console.log(error);
        await ctx.reply('Failed to fetch couriers. Please try again.');
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
};

module.exports.confirmDistribution = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');
    
    await ctx.reply('Tasdiqlaysizmi?', Markup.inlineKeyboard([
        [Markup.button.callback('Tasdiqlash', `accept-distribution:${courierId}:${amount}`)],
        [Markup.button.callback('Bekor qilish', 'cancel')]
    ]));
};

module.exports.acceptDistribution = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');
    const amountInt = parseInt(amount, 10);

    try {
        const courierResponse = await axios.get(`/courier/${courierId}`);
        const courier = courierResponse.data;
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierId}`);
        const courierActivity = courierActivityResponse.data;

        ctx.reply("Message sent to courier!");

        // Send message to the courier with inline buttons for accepting or rejecting the distribution
        await ctx.telegram.sendMessage(courier.telegram_chat_id, `You have received ${amountInt} eggs. Please confirm.`, Markup.inlineKeyboard([
            [Markup.button.callback('Accept', `courier-accept:${courierId}:${amountInt}`)],
            [Markup.button.callback('Reject', 'courier-reject')]
        ]));
    } catch (error) {
        console.log(error);
        await ctx.reply('Failed to notify the courier. Please try again.');
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
        
        await ctx.reply('Distribution confirmed and recorded successfully.');
    } catch (error) {
        console.log(error);
        await ctx.reply('Failed to update activities. Please try again.');
    }
};

module.exports.courierReject = async (ctx) => {
    await ctx.reply('Distribution rejected.');
};
