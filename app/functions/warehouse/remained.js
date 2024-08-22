const axios = require("../../axios");
const { Markup } = require("telegraf");
const groups = require("../data/groups");

const cancel = require("../general/cancel");

const { logger, readLog } = require("../../utils/logging");

const { categoriesByTextObject } = require("../general/categories");

const letters = require("../data/btnEmojis");

const eggs = {
    "D1": 960,
    "D2": 990
};

let botInstance = null;

const report = require("./report");

const setBotInstance = (bot) => {
    botInstance = bot;
};

const sendReport = async (ctx, warehousePhoneNum, data, forward, messageId) => {
    try {
        // Find the group id by courier"s phone number
        let groupId = groups;

        if (!groupId) {
            logger.info("remained. Warehouse groupId not found:", groupId, !groupId);
            await ctx.reply("Guruh topilmadi. Qayta urunib ko‘ring.");
        }

        if (forward) {
            if (!ctx.message.video_note || ctx.message.forward_from) {
                await ctx.reply("Iltimos, hisobot uchun dumaloq video yuboring.",
                    Markup.keyboard([
                        ["Bekor qilish ❌"]
                    ]));
                return;
            }

            if (ctx.message.video_note.duration < 5) {
                await ctx.reply("Hisobot uchun dumaloq video uzunligi 4 soniyadan kam bo‘lmasligi kerak.",
                    Markup.keyboard([
                        ["Bekor qilish ❌"]
                    ]));
                return;
            }

            // Forward the video to the group using message ID
            await ctx.telegram.forwardMessage(groupId, ctx.chat.id, messageId);
        }
        
        await report(data, ctx, groupId, "Ombor astatka", true);

        cancel(ctx, "Tanlang:");
    } catch (error) {
        logger.info(error);
        await ctx.reply("Hisobot chiqarishda xatolik yuz berdi. Qayta urunib ko’ring");
    }
}

module.exports.promptWarehouseRemainedConfirm = async (ctx) => {
    try {
        const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });
        const warehouseActivity = warehouseActivityResponse.data;

        const summaryMessage = Object.entries(warehouseActivity.current)
            .map(([category, amount]) => `${letters[category]}: ${amount}`)
            .join("\n");

        await ctx.reply(`Omborda qolgan tuxum bo’yicha ma’lumot:\n\n${summaryMessage}`,
            Markup.inlineKeyboard([
                [
                    Markup.button.callback("Ha ✅", "warehouse-remainedConfirm-yes"),
                    Markup.button.callback("Yo’q ❌", "warehouse-remainedConfirm-no"),
                ]
            ]))
    } catch (error) {
        logger.info(error);
        await ctx.reply("Xatolik yuz berdi!. Qayta urunib ko’ring");
    }
}

module.exports.confirmWarehouseRemained = async (ctx) => {
    try {
        const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });
        const warehouseActivity = warehouseActivityResponse.data;

        const updatedWarehouseActivity = {
            ...warehouseActivity,
            deficit: {},
            remained: warehouseActivity.current
        };

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity, {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });

        let groupId = groups;
        
        await report(updatedWarehouseActivity, ctx, groupId, "Ombor astatka", true);

        cancel(ctx, "Tanlang:");
        
        // sendReport(ctx, ctx.session.user.phone_num, updatedWarehouseActivity);
        await ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply("Xatolik yuz berdi!. Qayta urunib ko’ring!");
    }
}

module.exports.promptWarehouseRemained = async (ctx) => {
    try {
        const type = ((ctx?.match && ctx?.match[0] === "warehouse-dailyDeficit-no") || typeof ctx.session["warehouseRemained"] === "undefined") ? 2 : 1;

        const deleteMsg = ctx?.match && (ctx?.match[0] === "warehouse-dailyDeficit-no");

        if (deleteMsg) {
            await ctx.deleteMessage();
        }

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback("Ha ✅", "warehouse-dailyDeficit-yes"),
                Markup.button.callback("Yo’q ❌", "warehouse-dailyDeficit-no"),
            ]
        ]);

        if (type === 2) {
            await ctx.reply("Ombordagi qolgan tuxumlar sonini kiriting",
                Markup.keyboard([
                    ["Bekor qilish ❌"]
                ]));
        }

        categoriesByTextObject(ctx, "awaitingWarehouseRemained", "qolgan", keyboard, type, "warehouseRemained", eggs);
    } catch (error) {
        logger.info(error);
        await ctx.reply("Xatolik yuz berdi!. Qayta urunib ko’ring!");
    }
}

module.exports.sendDeficit = async (ctx) => {
    try {
        const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });
        const warehouseActivity = warehouseActivityResponse.data;

        const calculateDeficit = (current, remained) => {
            const deficit = {};
            for (const category in current) {
                deficit[category] = (current[category] || 0) - (remained[category] || 0);
            }
            return deficit;
        };

        const deficit = calculateDeficit(warehouseActivity.current, ctx.session.warehouseRemained);
        ctx.session.deficit = deficit;

        const deficitMessage = Object.entries(deficit)
            .map(([category, amount]) => `${letters[category]}: ${amount}ta`)
            .join("\n");

        await ctx.reply(`Sizda quyidagi tuxum kamomad aniqlandi:\n${deficitMessage}`);

        ctx.session.categories = null;
        ctx.session.currentCategoryIndex = null;
        
        this.promptCircleVideo(ctx);
    } catch (error) {
        logger.info(error);
        await ctx.reply("Xatolik yuz berdi! Qayta urunib ko’ring!");
    }
};

module.exports.promptCircleVideo = async (ctx) => {
    try {
        handleCircleVideo(ctx);
    //     await ctx.reply("Iltimos, hisobot uchun dumoloq video yuboring",
    //         Markup.keyboard([
    //             ["Bekor qilish ❌"]
    //         ]));
    //     ctx.session.awaitingCircleVideoWarehouse2 = true;
    //     await ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply("Xatolik yuz berdi!. Qayta urunib ko’ring!",
            Markup.keyboard([
                ["Bekor qilish ❌"]
            ]));
    }
}

const handleCircleVideo = async (ctx) => {
    try {
        const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });
        const warehouseActivity = warehouseActivityResponse.data;

        const updatedWarehouseActivity = {
            ...warehouseActivity,
            // calculated deficit
            deficit: ctx.session.deficit,
            // submitted by warehouse user 
            remained: ctx.session.warehouseRemained
        };

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity, {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });

        // const messageId = ctx.message.message_id;

        let groupId = groups;
        
        await report(updatedWarehouseActivity, ctx, groupId, "Ombor astatka", true);

        ctx.session["warehouseRemained"] = {};
        ctx.session["deficit"] = 0;

        cancel(ctx, "Tanlang:");

        // sendReport(ctx, ctx.session.user.phone_num, updatedWarehouseActivity, true, messageId);
    } catch (error) {
        logger.info(error);
        await ctx.reply("Xatolik yuz berdi!. Qayta urunib ko’ring!");
    }
}

module.exports.setBotInstance = setBotInstance;