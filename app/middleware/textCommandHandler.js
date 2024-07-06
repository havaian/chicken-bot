const start = require("../functions/start");
const addMore = require("../functions/addMore");
const selectCourier = require("../functions/selectCourier");
const todayDeliveries = require("../functions/todayDeliveries");
const cancel = require("../functions/cancel");

const commands = {
    'start': start,
    'Tuxum yetkazildi': addMore,
    'Tuxum chiqimi': selectCourier,
    'Bugungi yetkazilganlar': todayDeliveries,
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
