const axios = require("../../axios");
const { Markup } = require("telegraf");

const cancel = require("../general/cancel");

const { logger, readLog } = require("../../utils/logging");

const { categoriesByTextObject } = require("../general/categories");

const eggs = {
    "D1": 960,
    "D2": 990
};

const letters = require("../data/btnEmojis");

let botInstance = null;

const report = require("./report");

const setBotInstance = (bot) => {
    botInstance = bot;
};

module.exports.promptBroken = async (ctx) => {
    try {
        this.promptIncision(ctx);
        // const type = ((ctx?.match && ctx?.match[0] === "warehouse-dailyBroken-no") || typeof ctx.session["dailyBroken"] === "undefined") ? 2 : 1;

        // const deleteMsg = ctx?.match && (ctx?.match[0] === "warehouse-dailyBroken-no");

        // if (deleteMsg) {
        //     await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
        // }

        // const keyboard = Markup.inlineKeyboard([
        //     [
        //         Markup.button.callback("Ha ✅", "warehouse-dailyBroken-yes"),
        //         Markup.button.callback("Yo’q ❌", "warehouse-dailyBroken-no"),
        //     ]
        // ]);

        // if (type === 2) {
        //     await ctx.reply("Ombordagi singan tuxumlar sonini kiriting",
        //         Markup.keyboard([
        //             ["Bekor qilish ❌"]
        //         ]));
        // }

        // categoriesByTextObject(ctx, "awaitingWarehouseDailyBroken", "singan", keyboard, type, "dailyBroken", eggs);
    } catch (error) {
        logger.error(error);
        await ctx.reply("Singan tuxumlar sonini kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.confirmBroken = async (ctx) => {
    try {
        ctx.session.categories = null;
        ctx.session.currentCategoryIndex = null;
        this.promptIncision(ctx);
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    } catch (error) {
        logger.error(error);
        await ctx.reply("Nasechka tuxum sonini kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.promptIncision = async (ctx) => {
    try {
        const type = ((ctx?.match && ctx?.match[0] === "warehouse-dailyIncision-no") || typeof ctx.session["dailyIncision"] === "undefined") ? 2 : 1;

        const deleteMsg = ctx?.match && (ctx?.match[0] === "warehouse-dailyIncision-no");

        if (deleteMsg) {
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
        }

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback("Ha ✅", "warehouse-dailyIncision-yes"),
                Markup.button.callback("Yo’q ❌", "warehouse-dailyIncision-no"),
            ]
        ]);

        if (type === 2) {
            await ctx.reply("Nasechka tuxum sonini kiriting",
                Markup.keyboard([
                    ["Bekor qilish ❌"]
                ]));
        }

        categoriesByTextObject(ctx, "awaitingWarehouseDailyIncision", "nasechka", keyboard, type, "dailyIncision", eggs);
    } catch (error) {
        logger.error(error);
        await ctx.reply("Nasechka tuxumlar kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.confirmIncision = async (ctx) => {
    try {
        ctx.session.categories = null;
        ctx.session.currentCategoryIndex = null;
        this.promptIntact(ctx);
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    } catch (error) {
        logger.error(error);
        await ctx.reply("Butun tuxum sonini kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.promptIntact = async (ctx) => {
    try {
        const type = ((ctx?.match && ctx?.match[0] === "warehouse-dailyIntact-no") || typeof ctx.session["dailyIntact"] === "undefined") ? 2 : 1;

        const deleteMsg = ctx?.match && (ctx?.match[0] === "warehouse-dailyIntact-no");

        if (deleteMsg) {
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
        }

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback("Ha ✅", "warehouse-dailyIntact-yes"),
                Markup.button.callback("Yo’q ❌", "warehouse-dailyIntact-no"),
            ]
        ]);

        if (type === 2) {
            await ctx.reply("Ombordagi qolgan tuxum sonini kiriting",
                Markup.keyboard([
                    ["Bekor qilish ❌"]
                ]));
        }

        categoriesByTextObject(ctx, "awaitingWarehouseDailyIntact", "butun", keyboard, type, "dailyIntact", eggs);
    } catch (error) {
        logger.error(error);
        await ctx.reply("Butun tuxum kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

const updateCategorySum = (currentData = {}, newData = {}) => {
    try {
        return Object.entries(newData).reduce((acc, [key, value]) => {
            const actualKey = key === 'UP' ? 'D1' : key;
            acc[actualKey] = (acc[actualKey] || 0) + value;
            return acc;
        }, { ...currentData });
    } catch (error) {
        logger.error(error);
        ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
    }
};

const exceedsBrokenByCategory = (totalBroken, dailyIntact, dailyIncision) => {
    try {
        return Object.keys(dailyIntact).some(category => {
            const actualCategory = category === 'UP' ? 'D1' : category;
            const intact = dailyIntact[category] || 0;
            const incision = dailyIncision[category] || 0;
            const broken = totalBroken[actualCategory] || 0;
            return (intact + incision) > broken;
        });
    } catch (error) {
        logger.error(error);
        ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
    }
};

module.exports.confirmIntact = async (ctx) => {
    try {
        // const { dailyIntact, dailyBroken, dailyIncision } = ctx.session;

        // const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
        //     headers: {
        //         "x-user-telegram-chat-id": ctx.chat.id,
        //     },
        // });
        // const warehouseActivity = warehouseActivityResponse.data;

        // const totalBroken = warehouseActivity.distributed_to.reduce((acc, distribution) => {
        //     return updateCategorySum(acc, distribution.broken);
        // }, {});

        // const combinedBroken = updateCategorySum(totalBroken, dailyBroken);

        // if (exceedsBrokenByCategory(combinedBroken, dailyIntact, dailyIncision)) {
        //     await cancel(ctx, "Butun va nasechka tuxumlar soni singan tuxumlar sonidan ko’p bo’lishi mumkin emas", true);
        //     await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
        //     return;
        // }
        ctx.session.categories = null;
        ctx.session.currentCategoryIndex = null;
        this.promptMelange(ctx);
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    } catch (error) {
        logger.error(error);
        await ctx.reply("Butun tuxumlarni kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
};

module.exports.promptMelange = async (ctx) => {
    try {
        const type = ((ctx?.match && ctx?.match[0] === "warehouse-dailyMelanj-no") || typeof ctx.session["dailyMelange"] === "undefined") ? 2 : 1;

        const deleteMsg = ctx?.match && (ctx?.match[0] === "warehouse-dailyMelanj-no");

        if (deleteMsg) {
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
        }

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback("Ha ✅", "warehouse-dailyMelanj-yes"), 
                Markup.button.callback("Yo’q ❌", "warehouse-dailyMelanj-no")
            ],
        ]);

        // if (!isNaN(ctx.message.text)) {
        //     if (parseFloat(ctx.message.text) < (1 / 28)) {
        //         await ctx.reply(`Melanj ${1 / 28} litrdan kam bolishi mumkin emas`);
        //         return;
        //     }
        // }

        categoriesByTextObject(ctx, "awaitingWarehouseDailyMelange", "litr melanj", keyboard, type, "dailyMelange", eggs, true);
    } catch (error) {
        logger.error(error);
        await ctx.reply("Melanj kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
};

module.exports.confirmMelange = async (ctx) => {
    try {
        const { dailyIntact, dailyBroken, dailyIncision, dailyMelange } = ctx.session;

        const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
            headers: { "x-user-telegram-chat-id": ctx.chat.id },
        });
        const warehouseActivity = warehouseActivityResponse.data;
        
        const melange = {};
        const current = warehouseActivity.current || {};

        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;

        for (let y in Object.keys(dailyMelange || {})) {
            const x = Object.keys(dailyMelange)[y];
            if (typeof current[x] === "undefined") {
                current[x] = 0;
            }
            const result = ((current[x] - dailyIntact[x] - dailyIncision[x]) / 25) || 0;
            if (dailyMelange[x] < result) {
                await ctx.reply(`Sizda ${letters[x]} kategoriya bo’yicha kamida ${result} litr melanj chiqishi kerak edi!`,
                    Markup.keyboard([["Bekor qilish ❌"]])
                );
            }
            melange[x] = result;
        };

        let updatedWarehouseActivity;

        const updatedCurrent = updateCategory(warehouseActivity.current, dailyIntact, 'add', true);

        if (!warehouseActivity.intact || warehouseActivity.intact === 0) {
            updatedWarehouseActivity = {
                ...warehouseActivity,
                current: updateCategory(updatedCurrent, dailyIncision, 'subtract', true),
                remained: dailyIntact,
                old_current: warehouseActivity.current,
                intact: dailyIntact,
                // broken: dailyBroken,
                incision: dailyIncision,
                melange: melange,
                melange_by_warehouse: dailyMelange,
            };
        } else {
            updatedWarehouseActivity = {
                ...warehouseActivity,
                current: updateCategory(updatedCurrent, dailyIncision, 'subtract', true),
                intact: dailyIntact,
                broken: dailyBroken,
                incision: dailyIncision,
                melange: melange,
                melange_by_warehouse: dailyMelange,
            };
        }

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity, {
            headers: { "x-user-telegram-chat-id": ctx.chat.id },
        });

        await report(updatedWarehouseActivity, ctx, "Melanj", true);

        ctx.session["dailyBroken"] = undefined;
        ctx.session["dailyIntact"] = undefined;
        ctx.session["dailyIncision"] = undefined;
        ctx.session["dailyMelange"] = undefined;
        await cancel(ctx, "Tanlang:");
    } catch (error) {
        logger.error(error);
        await ctx.reply("Melanj kiritilishni tasdiqlashda xatolik yuz berdi. Qayta uruni ko’ring");
    }
};

const updateCategory = (currentData = {}, newData = {}, operation = 'add', isWarehouse = false) => {
    try {
        const allKeys = new Set([...Object.keys(currentData), ...Object.keys(newData)]);
        return Array.from(allKeys).reduce((acc, key) => {
            const actualKey = isWarehouse && key === 'UP' ? 'D1' : key;
            acc[actualKey] = operation === 'add'
                ? (currentData[actualKey] || 0) + (newData[key] || 0)
                : (currentData[actualKey] || 0) - (newData[key] || 0);
            return acc;
        }, {});
    } catch (error) {
        logger.error(error);
        ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
    }
};

module.exports.setBotInstance = setBotInstance;