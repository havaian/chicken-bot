const axios = require("../../axios");
const { Markup } = require("telegraf");

const { logger, readLog } = require("../../utils/logs");

module.exports = async (ctx) => {
    try {
        const response = await axios.get('/courier/all', {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });
        const couriers = response.data;

        if (couriers.length === 0) {
            await ctx.reply('Kuryerlar topilmadi.');
            return;
        }

        let message = "Kuryerni tanlang:\n";
        const buttons = couriers.map((courier, index) => {
            message += `${index + 1}. ${courier.full_name}\n`;
            return Markup.button.callback(`${index + 1}`, `select-courier:${courier._id}`);
        });

        const buttonRows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            buttonRows.push(buttons.slice(i, i + 5));
        }

        await ctx.reply(message, Markup.inlineKeyboard([
            ...buttonRows,
            [Markup.button.callback('Bekor qilish', 'cancel')]
        ]));

        await ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply('Failed to fetch couriers. Qayta urunib ko’ring');
    }
};

module.exports.selectAmount = async (ctx) => {
    const courierId = ctx.match[1];
    ctx.session.selectedCourierId = courierId;

    await ctx.reply('Nechta tuxum berildi?', Markup.inlineKeyboard([
        [Markup.button.callback('180', `confirm-distribution:${courierId}:180`), Markup.button.callback('360', `confirm-distribution:${courierId}:360`)],
        [Markup.button.callback('540', `confirm-distribution:${courierId}:540`), Markup.button.callback('720', `confirm-distribution:${courierId}:720`)],
        [Markup.button.callback('1080', `confirm-distribution:${courierId}:1080`), Markup.button.callback('1440', `confirm-distribution:${courierId}:1440`)],
        [Markup.button.callback('Boshqa', `confirm-distribution:${courierId}:other`)],
        [Markup.button.callback('Bekor qilish', 'cancel')]
    ]));

    await ctx.deleteMessage();
};

module.exports.confirmDistribution = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');

    if (amount === "other") {
        ctx.session.awaitingDistributedEggs = true;
        await ctx.reply('Iltimos, nechta tuxum tarqatilganini kiriting.');
    } else {
        const courierResponse = await axios.get(`/courier/${courierId}`, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });
        const courier = courierResponse.data;

        ctx.session.awaitingDistributedEggs = false;
        ctx.session.awaitingCourierCurrentEggs = true;

        await ctx.reply(`Siz ${amount}ta tuxum ${courier.full_name}ga berganingizni tanladingiz.`);

        if (eggsAmount < 0) {
            await ctx.reply('Noldan baland bo’lgan tuxum sonini kiriting');
            return;
        }

        await ctx.reply('Tasdiqlaysizmi?', Markup.inlineKeyboard([
            [Markup.button.callback('Tasdiqlash', `accept-distribution:${courierId}:${amount}`)],
            [Markup.button.callback('Bekor qilish', 'cancel')]
        ]));
    }

    await ctx.deleteMessage();
};

module.exports.acceptDistribution = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');
    const amountInt = parseInt(amount, 10);

    try {
        const courierResponse = await axios.get(`/courier/${courierId}`, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });
        const courier = courierResponse.data;

        ctx.reply(`Xabar ${courier.full_name}ga yetkazildi!`);

        await botInstance.telegram.sendMessage(courier.telegram_chat_id, `Sizning xisobingizga ${amountInt} tuxum qo’shildi. Iltimos, tasdiqlang.`, Markup.inlineKeyboard([
            [Markup.button.callback('Tasdiqlash', `courier-accept:${courierId}:${amountInt}`)],
            [Markup.button.callback('Rad etish', 'courier-reject')]
        ]));

        await ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply('Kuryerga xabar yetkazishda xatolik yuz berdi. Qayta urunib ko’ring');
    }
};

module.exports.courierAccept = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');
    const amountInt = parseInt(amount, 10);

    const redisKey = `distribution:${courierId}:${amountInt}`;
    const distributionData = await redis.get(redisKey);

    if (!distributionData) {
        await ctx.reply('Tasdiqlash vaqti tugagan yoki kutilmagan xatolik yuz berdi.');
        return;
    }

    try {
        const courierResponse = await axios.get(`/courier/${courierId}`, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });
        const courier = courierResponse.data;
        
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierId}`, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });
        const courierActivity = courierActivityResponse.data;

        const updatedCourierActivity = {
            ...courierActivity,
            current: courierActivity.current + amountInt,
            accepted: courierActivity.accepted + amountInt
        };

        await axios.put(`/courier/activity/${courierActivity._id}`, updatedCourierActivity);

        const warehouseActivityResponse = await axios.get('/warehouse/activity/today', {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });
        const warehouseActivity = warehouseActivityResponse.data;

        // Update warehouse distributed_to
        const distributionDetails = {
            courier_id: courierId,
            courier_name: courier.full_name,
            eggs: amountInt,
            time: new Date().toLocaleString()
        };

        const updatedWarehouseActivity = {
            ...warehouseActivity,
            current: warehouseActivity.current - amountInt,
            distributed_to: [...warehouseActivity.distributed_to, distributionDetails]
        };

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });

        await ctx.deleteMessage();
        await ctx.reply('Tuxum xisobingizga muvaffaqiyatli qo’shildi va saqlandi.');
    } catch (error) {
        logger.info(error);
        await ctx.reply('Tuxum xisobingizga qo’shishda xatolik yuz berdi. Qayta urunib ko’ring');
    } finally {
        await redis.del(redisKey);
    }
};

module.exports.courierReject = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');
    
    await ctx.deleteMessage();
    await ctx.reply('Tuxum xisobga qo’shilishi rad etildi.');
};

module.exports.courierCurrent = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');

    ctx.session.awaitingCourierCurrentEggs = false;
    ctx.session.awaitingCourierBrokenEggs = true;
}

module.exports.courierBroken = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');

    ctx.session.awaitingCourierBrokenEggs = false;
}