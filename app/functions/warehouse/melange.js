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

const { logger, readLog } = require("../../utils/logs");

let botInstance = null;

const setBotInstance = (bot) => {
    botInstance = bot;
};

module.exports.promptBroken = async (ctx) => {
    try {
        const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });
        const warehouseActivity = warehouseActivityResponse.data;
        
        ctx.session.awaitingWarehouseDailyBroken = true;
        await ctx.reply("Ombordagi singan tuxumlar sonini kiriting",
            Markup.keyboard([
              ["Bekor qilish"]
            ]).resize().oneTime());
    } catch (error) {
        logger.info(error);
        await ctx.reply("Singan tuxumlar sonini kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.acceptBroken = async (ctx) => {
    try {
        const amount = ctx.text;
        const amountInt = parseInt(amount, 10);
        ctx.session.dailyBroken = amountInt;
        await ctx.reply(`${amountInt}ta singan tuxum kiritildi`)
        await ctx.reply("Tasdiqlaysizmi?",
            Markup.inlineKeyboard([
                [
                    Markup.button.callback("Ha", "warehouse-dailyBroken-yes"),
                    Markup.button.callback("Yo’q", "warehouse-dailyBroken-no"),
                ]
            ]));
    } catch (error) {
        logger.info(error);
        await ctx.reply("Singan tuxum kiritilganini tasdiqlashda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.confirmBroken = async (ctx) => {
    try {
        this.promptIncision(ctx);
        await ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply("Nasechka tuxum sonini kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.promptIncision = async (ctx) => {
    try {
        ctx.session.awaitingWarehouseDailyBroken = false;
        ctx.session.awaitingWarehouseDailyIncision = true;
        await ctx.reply("Nasechka tuxum sonini kiriting",
            Markup.keyboard([
              ["Bekor qilish"]
            ]).resize().oneTime());
    } catch (error) {
        logger.info(error);
        await ctx.reply("Nasechka tuxumlar kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.acceptIncision = async (ctx) => {
    try {
        const amount = ctx.text;
        const amountInt = parseInt(amount, 10);
        ctx.session.dailyIncision = amountInt;
        await ctx.reply(`${amountInt}ta nasechka tuxum kiritildi`)
        await ctx.reply("Tasdiqlaysizmi?",
            Markup.inlineKeyboard([
                [
                    Markup.button.callback("Ha", "warehouse-dailyIncision-yes"),
                    Markup.button.callback("Yo’q", "warehouse-dailyIncision-no"),
                ]
            ]));
    } catch (error) {
        logger.info(error);
        await ctx.reply("Nasechka tuxum kiritilganini tasdiqlashda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.confirmIncision = async (ctx) => {
    try {
        this.promptIntact(ctx);
        await ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply("Butun tuxum sonini kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.promptIntact = async (ctx) => {
    try {
        ctx.session.awaitingWarehouseDailyIncision = false;
        ctx.session.awaitingWarehouseDailyIntact = true;
        await ctx.reply("Butun tuxum sonini kiriting",
            Markup.keyboard([
              ["Bekor qilish"]
            ]).resize().oneTime());
    } catch (error) {
        logger.info(error);
        await ctx.reply("Butun tuxum kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.acceptIntact = async (ctx) => {
    try {
        const amount = ctx.text;
        const amountInt = parseInt(amount, 10);
        ctx.session.dailyIntact = amountInt;
        await ctx.reply(`${amountInt}ta butun tuxum kiritildi`)
        await ctx.reply("Tasdiqlaysizmi?",
            Markup.inlineKeyboard([
                [
                    Markup.button.callback("Ha", "warehouse-dailyIntact-yes"),
                    Markup.button.callback("Yo’q", "warehouse-dailyIntact-no"),
                ]
            ]));
    } catch (error) {
        logger.info(error);
        await ctx.reply("Butun tuxum kiritilganini tasdiqlastishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.confirmIntact = async (ctx) => {
    try {
        const { dailyIntact, dailyBroken, dailyIncision } = ctx.session;

        const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });
        const warehouseActivity = warehouseActivityResponse.data;

        const totalBroken = warehouseActivity.distributed_to.reduce(
            (acc, distribution) => acc + distribution.broken || 0,
            0
        );
        
        if ((totalBroken + dailyBroken) < (dailyIntact + dailyIncision)) {
            cancel(ctx, `Butun va nasechka tuxumlar soni singan tuxumlar sonidan ko’p bo’lishi mumkin emas`, showKeyboard = false);
            await ctx.deleteMessage();
            this.promptBroken(ctx);
            return;
        }

        this.promptMelange(ctx);
        await ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply("Butun tuxumlarni kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.promptMelange = async (ctx) => {
    try {
        ctx.session.awaitingWarehouseDailyIntact = false;
        ctx.session.awaitingWarehouseDailyMelange = true;
        await ctx.reply("Melanj nechchi litr chiqqanini kiriting",
            Markup.keyboard([
              ["Bekor qilish"]
            ]).resize().oneTime());
    } catch (error) {
        logger.info(error);
        await ctx.reply("Melanj kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.acceptMelange = async (ctx) => {
    try {
        const amount = ctx.text;
        const amountFloat = parseFloat(amount, 2);
        ctx.session.dailyMelange = amountFloat;
        await ctx.reply(`${amountFloat} litr melanj kiritildi`)
        await ctx.reply("Tasdiqlaysizmi?",
            Markup.inlineKeyboard([
                [
                    Markup.button.callback("Ha", "warehouse-dailyMelanj-yes"),
                    Markup.button.callback("Yo’q", "warehouse-dailyMelanj-no"),
                ]
            ]));
    } catch (error) {
        logger.info(error);
        await ctx.reply("Butun tuxum kiritilganini tasdiqlastishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.confirmMelange = async (ctx) => {
    try {
        const { dailyIntact, dailyBroken, dailyIncision } = ctx.session;

        const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });
        const warehouseActivity = warehouseActivityResponse.data;

        const totalBroken = warehouseActivity.distributed_to.reduce(
            (acc, distribution) => acc + distribution.broken || 0,
            0
        );

        const melange = ((totalBroken + dailyBroken) - (dailyIntact + dailyIncision)) / 25;

        if (ctx.session.dailyMelange < melange) {
            await ctx.reply(`Sizda kamida ${melange} litr melanj chiqishi kerak edi!`,
                Markup.keyboard([
                    ["Bekor qilish"]
                ]).resize().oneTime());
            await ctx.deleteMessage();
            this.promptMelange(ctx);
            return;
        }

        let updatedWarehouseActivity;

        if (warehouseActivity.intact === undefined || warehouseActivity.intact === null || warehouseActivity.intact === 0) {
            // Intact is being set for the first time
            updatedWarehouseActivity = {
                ...warehouseActivity,
                current: warehouseActivity.current + dailyIntact,
                remained: warehouseActivity.current + dailyIntact,
                old_current: warehouseActivity.current,
                intact: dailyIntact,
                broken: dailyIntact,
                incision: dailyIntact,
                melange: melange
            };
        } else {
            // Intact has already been set, use old_current
            updatedWarehouseActivity = {
                ...warehouseActivity,
                current: warehouseActivity.old_current + dailyIntact,
                remained: warehouseActivity.old_current + dailyIntact,
                intact: dailyIntact,
                broken: dailyBroken,
                incision: dailyIncision,
                melange: melange
            };
        }

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity, {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });

        const warehousePhoneNum = ctx.session.user.phone_num;
  
        // Find the group id by courier"s phone number
        let groupId = null;
        for (const phone_num of warehousePhoneNum) {
            for (const [id, numbers] of Object.entries(groups)) {
              if (numbers.includes(phone_num)) {
                groupId = id;
                break;
              }
            }
            if (groupId) {
              break;
            }
          }

        if (!groupId) {
            logger.info("melange. Warehouse groupId not found:", groupId, !groupId);
            await ctx.reply("Guruh topilmadi. Qayta urunib ko‘ring.");
            return;
        }

        // Generate HTML and Excel reports
        const reportDate = new Date().toISOString().split("T")[0];
        const reportDir = `reports/warehouse/${reportDate}`;
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        // Delete old reports
        fs.readdirSync(reportDir).forEach((file) => {
            fs.unlinkSync(path.join(reportDir, file));
        });

        const htmlFilename = `${reportDir}/warehouse_${reportDate}.html`;
        const imageFilename = `${reportDir}/warehouse_${reportDate}.jpg`;
        const excelFilename = `${reportDir}/warehouse_${reportDate}.xlsx`;

        generateWarehouseHTML(updatedWarehouseActivity, htmlFilename);
        await generateWarehouseExcel(updatedWarehouseActivity, excelFilename);
        await convertHTMLToImage(htmlFilename, imageFilename);

        // Forward reports to the group
        await ctx.telegram.sendDocument(
            groupId,
            { source: excelFilename },
            { caption: `Xisobot: ${ctx.session.user.full_name}` }
        );
        await ctx.telegram.sendPhoto(
            groupId,
            { source: imageFilename },
            { caption: `Xisobot: ${ctx.session.user.full_name}` }
        );

        await ctx.deleteMessage();
        cancel(ctx, "Tanlang:");
    } catch (error) {
        logger.info(error);
        await ctx.reply("Melanj kiritilishni tasdiqlashda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.setBotInstance = setBotInstance;