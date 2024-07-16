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

let botInstance = null;

const setBotInstance = (bot) => {
    botInstance = bot;
};

const sendReport = async (ctx, warehousePhoneNum, data, forward, messageId) => {
    try {
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
            logger.info("remained. Warehouse groupId not found:", groupId, !groupId);
            await ctx.reply("Guruh topilmadi. Qayta urunib ko‘ring.");
            return;
        }

        if (forward) {
            if (!ctx.message.video_note || ctx.message.forward_from) {
                await ctx.reply("Iltimos, hisobot uchun dumaloq video yuboring.",
                    Markup.keyboard([
                        ["Bekor qilish"]
                    ]).resize().oneTime());
                return;
            }

            if (ctx.message.video_note.duration < 5) {
                await ctx.reply("Hisobot uchun dumaloq video uzunligi 4 soniyadan kam bo‘lmasligi kerak.",
                    Markup.keyboard([
                        ["Bekor qilish"]
                    ]).resize().oneTime());
                return;
            }

            // Forward the video to the group using message ID
            await ctx.telegram.forwardMessage(groupId, ctx.chat.id, messageId);
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

        generateWarehouseHTML(data, htmlFilename);
        await generateWarehouseExcel(data, excelFilename);
        await convertHTMLToImage(htmlFilename, imageFilename);

        // Send image and Excel file to user
        await ctx.replyWithPhoto({ source: imageFilename });
        await ctx.replyWithDocument({ source: excelFilename });

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

        await ctx.reply(`Omborda ${warehouseActivity.current}ta tuxum qolgan.`,
            Markup.inlineKeyboard([
                [
                    Markup.button.callback("Ha", "warehouse-remainedConfirm-yes"),
                    Markup.button.callback("Yo’q", "warehouse-remainedConfirm-no"),
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
            deficit: 0,
            remained: warehouseActivity.current
        };

        await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity, {
            headers: {
                "x-user-telegram-chat-id": ctx.chat.id,
            },
        });

        const warehousePhoneNum = ctx.session.user.phone_num;

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

        generateWarehouseHTML(data, htmlFilename);
        await generateWarehouseExcel(data, excelFilename);
        await convertHTMLToImage(htmlFilename, imageFilename);

        // Send image and Excel file to user
        await ctx.replyWithPhoto({ source: imageFilename });
        await ctx.replyWithDocument({ source: excelFilename });

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

        cancel(ctx, "Tanlang:");
        
        // sendReport(ctx, warehousePhoneNum, updatedWarehouseActivity);
        await ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply("Xatolik yuz berdi!. Qayta urunib ko’ring!");
    }
}

module.exports.promptWarehouseRemained = async (ctx) => {
    try {
        await ctx.reply("Ombordagi tuxum sonini kiriting",
            Markup.keyboard([
                ["Bekor qilish"]
            ]).resize().oneTime());
        ctx.session.awaitingWarehouseRemained = true;
        await ctx.deleteMessage();
    } catch (error) {
        logger.info(error);
        await ctx.reply("Xatolik yuz berdi!. Qayta urunib ko’ring!");
    }
}

module.exports.acceptWarehouseDeficit = async (ctx) => {
    try {
        const amount = ctx.text;
        const amountInt = parseInt(amount, 10);
        ctx.session.warehouseRemained = amountInt;

        await ctx.reply(`Tasdiqlang`,
            Markup.inlineKeyboard([
                [
                    Markup.button.callback("Ha", "warehouse-dailyDeficit-yes"),
                    Markup.button.callback("Yo’q", "warehouse-dailyDeficit-no"),
                ]
            ]))
        ctx.session.awaitingWarehouseRemained = false;
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

        const deficit = warehouseActivity.current - ctx.session.warehouseRemained;
        ctx.session.deficit = deficit;

        await ctx.reply(`Sizda ${deficit}ta tuxum kamomad aniqlandi`);

        this.promptCircleVideo(ctx,);
    } catch (error) {
        logger.info(error);
        await ctx.reply("Xatolik yuz berdi!. Qayta urunib ko’ring!");
    }
}

module.exports.promptCircleVideo = async (ctx) => {
    handleCircleVideo(ctx);
    // try {
    //     await ctx.reply("Iltimos, hisobot uchun dumoloq video yuboring",
    //         Markup.keyboard([
    //             ["Bekor qilish"]
    //         ]).resize().oneTime());
    //     ctx.session.awaitingCircleVideoWarehouse2 = true;
    //     await ctx.deleteMessage();
    // } catch (error) {
    //     logger.info(error);
    //     await ctx.reply("Xatolik yuz berdi!. Qayta urunib ko’ring!",
    //         Markup.keyboard([
    //             ["Bekor qilish"]
    //         ]).resize().oneTime());
    // }
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

        const messageId = ctx.message.message_id;

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

        generateWarehouseHTML(data, htmlFilename);
        await generateWarehouseExcel(data, excelFilename);
        await convertHTMLToImage(htmlFilename, imageFilename);

        // Send image and Excel file to user
        await ctx.replyWithPhoto({ source: imageFilename });
        await ctx.replyWithDocument({ source: excelFilename });

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

        cancel(ctx, "Tanlang:");

        // sendReport(ctx, ctx.session.user.phone_num, updatedWarehouseActivity, true, messageId);
    } catch (error) {
        logger.info(error);
        await ctx.reply("Xatolik yuz berdi!. Qayta urunib ko’ring!");
    }
}

module.exports.setBotInstance = setBotInstance;