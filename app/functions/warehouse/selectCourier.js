const axios = require("../../axios");
const Redis = require("ioredis");
const { Markup } = require("telegraf");

const redis = new Redis(process.env.REDIS_URL);
let botInstance = null;

redis.on('connect', () => {
    console.log('Redis✅');
    checkPendingDistributions();
});

redis.on('error', (err) => {
    console.log('❌ Redis:', err);
});

const setBotInstance = (bot) => {
    botInstance = bot;
    setInterval(checkPendingDistributions, 10 * 60 * 1000);
};

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

    await ctx.deleteMessage();
};

module.exports.confirmDistribution = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');
    
    await ctx.reply('Tasdiqlaysizmi?', Markup.inlineKeyboard([
        [Markup.button.callback('Tasdiqlash', `accept-distribution:${courierId}:${amount}`)],
        [Markup.button.callback('Bekor qilish', 'cancel')]
    ]));

    await ctx.deleteMessage();
};

module.exports.acceptDistribution = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');
    const amountInt = parseInt(amount, 10);

    try {
        const courierResponse = await axios.get(`/courier/${courierId}`);
        const courier = courierResponse.data;

        ctx.reply(`Xabar ${courier.full_name}ga yetkazildi!`);

        await botInstance.telegram.sendMessage(courier.telegram_chat_id, `Sizning xisobingizga ${amountInt} tuxum qo\'shildi. Iltimos, tasdiqlang. Agar 15 daqiqa ichida tasdiqlamasangiz, tuxumlar avtomatik tarzda qabul qilinadi.`, Markup.inlineKeyboard([
            [Markup.button.callback('Tasdiqlash', `courier-accept:${courierId}:${amountInt}`)],
            [Markup.button.callback('Rad etish', 'courier-reject')]
        ]));

        const redisKey = `distribution:${courierId}:${amountInt}`;
        const expirationTimestamp = Date.now() + 15 * 60 * 1000;
        await redis.set(redisKey, JSON.stringify({ courierId, amountInt, expirationTimestamp }));

        setTimeout(async () => {
            const distributionData = await redis.get(redisKey);
            if (distributionData) {
                await automaticallyAcceptDistribution(courierId, amountInt);
                const courier = (await axios.get(`/courier/${courierId}`)).data;
                await botInstance.telegram.sendMessage(courier.telegram_chat_id, `Sizning xisobingizga ${amountInt} tuxum avtomatik tarzda qabul qilindi.`);
            }
        }, 15 * 60 * 1000);

        await ctx.deleteMessage();
    } catch (error) {
        console.log(error);
        await ctx.reply('Kuryerga xabar yetkazishda xatolik yuz berdi. Qayta urunib ko\'ring');
    }
};

const automaticallyAcceptDistribution = async (courierId, amountInt) => {
    const redisKey = `distribution:${courierId}:${amountInt}`;
    const distributionData = await redis.get(redisKey);

    if (!distributionData) {
        return;
    }

    try {
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierId}`);
        const courierActivity = courierActivityResponse.data;

        const updatedCourierActivity = {
            ...courierActivity,
            current: courierActivity.current + amountInt
        };

        await axios.put(`/courier/activity/${courierActivity._id}`, updatedCourierActivity);

        const warehouseActivityResponse = await axios.get('/warehouse/activity/today');
        const warehouseActivity = warehouseActivityResponse.data;

        const distributionDetails = {
            courier_id: courierId,
            courier_name: updatedCourierActivity.courier_name,
            eggs: amountInt,
            time: new Date().toLocaleString()
        };

        const updatedWarehouseActivity = {
            ...warehouseActivity,
            current: warehouseActivity.current - amountInt,
            distributed_to: [...warehouseActivity.distributed_to, distributionDetails]
        };

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity);

        await redis.del(redisKey);
        
    } catch (error) {
        console.log(error);
    }
};

const checkPendingDistributions = async () => {
    try {
        const keys = await redis.keys('distribution:*');
        for (const key of keys) {
            const distributionData = await redis.get(key);
            if (distributionData) {
                const { courierId, amountInt, expirationTimestamp } = JSON.parse(distributionData);
                if (Date.now() >= expirationTimestamp) {
                    await automaticallyAcceptDistribution(courierId, amountInt);
                    const courier = (await axios.get(`/courier/${courierId}`)).data;
                    await botInstance.telegram.sendMessage(courier.telegram_chat_id, `Sizning xisobingizga ${amountInt} tuxum avtomatik tarzda qabul qilindi.`);
                } else {
                    const remainingTime = expirationTimestamp - Date.now();
                    setTimeout(async () => {
                        await automaticallyAcceptDistribution(courierId, amountInt);
                        const courier = (await axios.get(`/courier/${courierId}`)).data;
                        await botInstance.telegram.sendMessage(courier.telegram_chat_id, `Sizning xisobingizga ${amountInt} tuxum avtomatik tarzda qabul qilindi.`);
                    }, remainingTime);
                }
            }
        }
    } catch (error) {
        console.log(error);
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
        const courierResponse = await axios.get(`/courier/${courierId}`);
        const courier = courierResponse.data;
        
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierId}`);
        const courierActivity = courierActivityResponse.data;

        const updatedCourierActivity = {
            ...courierActivity,
            current: courierActivity.current + amountInt
        };

        await axios.put(`/courier/activity/${courierActivity._id}`, updatedCourierActivity);

        const warehouseActivityResponse = await axios.get('/warehouse/activity/today');
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

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity);

        await ctx.deleteMessage();
        await ctx.reply('Tuxum xisobingizga muvaffaqiyatli qo\'shildi va saqlandi.');
    } catch (error) {
        console.log(error);
        await ctx.reply('Tuxum xisobingizga qo\'shishda xatolik yuz berdi. Qayta urunib ko\'ring');
    } finally {
        await redis.del(redisKey);
    }
};

module.exports.courierReject = async (ctx) => {
    const [action, courierId, amount] = ctx.match[0].split(':');
    const amountInt = parseInt(amount, 10);

    const redisKey = `distribution:${courierId}:${amountInt}`;
    
    await ctx.deleteMessage();
    await ctx.reply('Tuxum xisobga qo\'shish rad etildi.');

    await redis.del(redisKey);
};

module.exports.setBotInstance = setBotInstance;
