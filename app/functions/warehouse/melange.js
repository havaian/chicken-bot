const axios = require("../../axios");
const { Markup } = require("telegraf");
const {
    generateWarehouseHTML,
    generateWarehouseExcel,
} = require("../report/warehouseReport");
const convertHTMLToImage = require("../report/convertHTMLToImage");
const groups = require("../data/groups");
const path = require("path");
const fs = require("fs");

const cancel = require("../general/cancel");

const { logger, readLog } = require("../../utils/logging");

const { categoriesByTextObject } = require("../general/categories");

const eggs = {
    "D1": 960,
    "D2": 990
};

let botInstance = null;

const setBotInstance = (bot) => {
    botInstance = bot;
};

module.exports.promptBroken = async (ctx) => {
    try {
        this.promptIncision(ctx);
        // const type = ((ctx?.match && ctx?.match[0] === "warehouse-dailyBroken-no") || typeof ctx.session["dailyBroken"] === "undefined") ? 2 : 1;

        // const deleteMsg = ctx?.match && (ctx?.match[0] === "warehouse-dailyBroken-no");

        // if (deleteMsg) {
        //     await ctx.deleteMessage();
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
        logger.info(error);
        await ctx.reply("Singan tuxumlar sonini kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.confirmBroken = async (ctx) => {
    try {
        ctx.session.categories = null;
        ctx.session.currentCategoryIndex = null;
        this.promptIncision(ctx);
        await ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply("Nasechka tuxum sonini kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.promptIncision = async (ctx) => {
    try {
        const type = ((ctx?.match && ctx?.match[0] === "warehouse-dailyIncision-no") || typeof ctx.session["dailyIncision"] === "undefined") ? 2 : 1;

        const deleteMsg = ctx?.match && (ctx?.match[0] === "warehouse-dailyIncision-no");

        if (deleteMsg) {
            await ctx.deleteMessage();
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
        logger.info(error);
        await ctx.reply("Nasechka tuxumlar kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.confirmIncision = async (ctx) => {
    try {
        ctx.session.categories = null;
        ctx.session.currentCategoryIndex = null;
        this.promptIntact(ctx);
        await ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply("Butun tuxum sonini kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.promptIntact = async (ctx) => {
    try {
        const type = ((ctx?.match && ctx?.match[0] === "warehouse-dailyIntact-no") || typeof ctx.session["dailyIntact"] === "undefined") ? 2 : 1;

        const deleteMsg = ctx?.match && (ctx?.match[0] === "warehouse-dailyIntact-no");

        if (deleteMsg) {
            await ctx.deleteMessage();
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
        logger.info(error);
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
        logger.info(error);
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
        logger.info(error);
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
        //     await ctx.deleteMessage();
        //     return;
        // }
        ctx.session.categories = null;
        ctx.session.currentCategoryIndex = null;
        this.promptMelange(ctx);
        await ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply("Butun tuxumlarni kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
};

module.exports.promptMelange = async (ctx) => {
    try {
        const type = ((ctx?.match && ctx?.match[0] === "warehouse-dailyMelanj-no") || typeof ctx.session["dailyMelange"] === "undefined") ? 2 : 1;

        const deleteMsg = ctx?.match && (ctx?.match[0] === "warehouse-dailyMelanj-no");

        if (deleteMsg) {
            await ctx.deleteMessage();
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
        logger.info(error);
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

        await ctx.deleteMessage();

        for (let y in Object.keys(dailyMelange || {})) {
            const x = Object.keys(dailyMelange)[y];
            if (typeof current[x] === "undefined") {
                current[x] = 0;
            }
            const result = ((current[x] - dailyIntact[x] - dailyIncision[x]) / 25) || 0;
            if (dailyMelange[x] < result) {
                await ctx.reply(`Sizda ${x} kategoriya bo’yicha kamida ${result} litr melanj chiqishi kerak edi!`,
                    Markup.keyboard([["Bekor qilish ❌"]]),
                    Markup.inlineKeyboard([
                    [Markup.button.callback("Yangidan kiritish", "confirm-left-no")],
                    [Markup.button.callback("Boshiga qaytish", "cancel")],
                    ])
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

        const warehousePhoneNum = ctx.session.user.phone_num;

        let groupId = null;
        for (const phone_num of warehousePhoneNum) {
            for (const [id, numbers] of Object.entries(groups)) {
                if (numbers.includes(phone_num)) {
                    groupId = id;
                    break;
                }
            }
            if (groupId) break;
        }

        if (!groupId) {
            logger.info("melange. Warehouse groupId not found:", groupId, !groupId);
            await ctx.reply("Guruh topilmadi. Qayta urunib ko‘ring.");
            return;
        }

        const reportDate = new Date().toISOString().split("T")[0];
        const reportDir = `reports/warehouse/${reportDate}`;
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

        fs.readdirSync(reportDir).forEach(file => {
            fs.unlinkSync(path.join(reportDir, file));
        });

        const htmlFilename = `${reportDir}/warehouse_${reportDate}.html`;
        const imageFilename = `${reportDir}/warehouse_${reportDate}.jpg`;
        const excelFilename = `${reportDir}/warehouse_${reportDate}.xlsx`;

        generateWarehouseHTML(updatedWarehouseActivity, htmlFilename);
        await generateWarehouseExcel(updatedWarehouseActivity, excelFilename);
        await convertHTMLToImage(htmlFilename, imageFilename);


        // Forward reports to the group
        // await ctx.telegram.sendDocument(groupId, { source: excelFilename }, { caption: `${courier.full_name}. Ombor uchun melanj kiritildi. Xisobot:` });
        await ctx.telegram.sendPhoto(groupId, { source: imageFilename }, { caption: `${ctx.session.user.full_name}. Ombor. Melanj. Xisobot:` });

        ctx.session["dailyBroken"] = undefined;
        ctx.session["dailyIntact"] = undefined;
        ctx.session["dailyIncision"] = undefined;
        ctx.session["dailyMelange"] = undefined;
        cancel(ctx, "Tanlang:");
    } catch (error) {
        logger.info(error);
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
        logger.info(error);
        ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
    }
};

module.exports.setBotInstance = setBotInstance;