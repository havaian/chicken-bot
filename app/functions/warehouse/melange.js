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

const { logger, readLog } = require("../../utils/logs");

let botInstance = null;

const setBotInstance = (bot) => {
    botInstance = bot;
};

module.exports.promptBroken = async (ctx) => {
    try {
        ctx.session.awaitingWarehouseDailyBroken = true;
        await ctx.reply("Ombordagi singan tuxumlar sonini kiriting");
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
                ],
                [Markup.button.callback("Bekor qilish", "cancel")],
            ]));
    } catch (error) {
        logger.info(error);
        await ctx.reply("Singan tuxum kiritilganini tasdiqlashda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.confirmBroken = async (ctx) => {
    try {
        const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });
        const warehouseActivity = warehouseActivityResponse.data;

        const updatedWarehouseActivity = {
            ...warehouseActivity,
            broken: ctx.session.dailyBroken
        };

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity, {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });

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
        await ctx.reply("Nasechka tuxum sonini kiriting");
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
                ],
                [Markup.button.callback("Bekor qilish", "cancel")],
            ]));
    } catch (error) {
        logger.info(error);
        await ctx.reply("Nasechka tuxum kiritilganini tasdiqlashda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.confirmIncision = async (ctx) => {
    try {
        const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });
        const warehouseActivity = warehouseActivityResponse.data;

        const updatedWarehouseActivity = {
            ...warehouseActivity,
            incision: ctx.session.dailyIncision,
        };

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity, {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });

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
        await ctx.reply("Butun tuxum sonini kiriting");
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
                ],
                [Markup.button.callback("Bekor qilish", "cancel")],
            ]));
    } catch (error) {
        logger.info(error);
        await ctx.reply("Butun tuxum kiritilganini tasdiqlastishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.confirmIntact = async (ctx) => {
    try {
        const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });
        const warehouseActivity = warehouseActivityResponse.data;

        const updatedWarehouseActivity = {
            ...warehouseActivity,
            current: warehouseActivity.current + ctx.session.dailyIntact,
            intact: ctx.session.dailyIntact,
        };

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity, {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });

        this.promptMelange(ctx);
        await ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply("Melanj kiritishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.promptMelange = async (ctx) => {
    try {
        ctx.session.awaitingWarehouseDailyIntact = false;
        ctx.session.awaitingWarehouseDailyMelange = true;
        await ctx.reply("Melanj nechchi litr chiqqanini kiriting");
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
                ],
                [Markup.button.callback("Bekor qilish", "cancel")],
            ]));
    } catch (error) {
        logger.info(error);
        await ctx.reply("Butun tuxum kiritilganini tasdiqlastishda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.confirmMelange = async (ctx) => {
    try {
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
        const melange = (totalBroken + warehouseActivity.broken - warehouseActivity.intact - warehouseActivity.incision) / 25;

        if (ctx.session.dailyMelange < melange) {
            await ctx.reply(`Sizda kamida ${melange} litr melanj chiqishi kerak edi!`);
            await ctx.deleteMessage();
            this.promptMelange(ctx);
            return;
        }

        const updatedWarehouseActivity = {
            ...warehouseActivity,
            melange: melange,
        };

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

        ctx.session.awaitingWarehouseDailyMelange = false;
        ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply("Melanj kiritilishni tasdiqlashda xatolik yuz berdi. Qayta uruni ko’ring");
    }
}

module.exports.setBotInstance = setBotInstance;