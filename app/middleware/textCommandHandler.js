const start = require("../functions/general/start");
const addMore = require("../functions/courier/addMore");
const selectCourier = require("../functions/warehouse/selectCourier");
const todayDeliveries = require("../functions/courier/todayDeliveries");
const cancel = require("../functions/general/cancel");

const commands = {
    'start': start,
    'Tuxum yetkazildi': addMore,
    'Tuxum chiqimi': selectCourier,
    'Hisobot': todayDeliveries,
    'Bekor qilish': cancel
};

const textCommandHandler = async (ctx, next) => {
    if (ctx.message && ctx.message.text) {
        const text = ctx.message.text;
        const commandFunction = commands[text];

        if (commandFunction) {
            await commandFunction(ctx);
        } else {
            await next();
        }
    } else {
        await next();
    }
};

module.exports = textCommandHandler;
