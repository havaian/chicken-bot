const { Markup } = require("telegraf");
const axios = require("../../axios");
const eggs = require("../data/prices");
const { logger } = require("../../utils/logging");
const letters = require("../data/btnEmojis");

module.exports.categoriesByButtonsObject = async (ctx, sessionKey, actionKey1, actionKey2, message1, message2, keyboard, type = 1, eggsDataKey) => { 
    try {
        if (!ctx.session.categories || type === 2) {
            ctx.session.categories = Object.keys(eggs);
            ctx.session.currentCategoryIndex = 0;
            ctx.session[eggsDataKey] = {};
        }
        
        const [action, amount, category] = ctx.match[0].split(":");
    
        if (action === actionKey1) {
            if (!ctx.session[eggsDataKey][category]) {
                ctx.session[eggsDataKey][category] = 0;
            }
            ctx.session[eggsDataKey][category] += parseInt(amount, 10);
    
            ctx.session.currentCategoryIndex++;
    
            // Delete the previous message
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
        } else if (action === actionKey2) {
            const category = ctx.session.categories[ctx.session.currentCategoryIndex];
    
            ctx.session[sessionKey] = true;
            await ctx.reply(`Nechta ${letters[category]} kategoriya tuxum ${message2} kiriting:`);
    
            // Delete the previous message
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
            return;
        }
    
        if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
            const category = ctx.session.categories[ctx.session.currentCategoryIndex];
    
            await ctx.reply(
                `Nechta ${letters[category]} kategoriya tuxum ${message1}?`,
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback("Keyingisi", `${actionKey1}:0:${category}`),
                    ],
                    [
                        Markup.button.callback(`180 ${letters[category]}`, `${actionKey1}:180:${category}`),
                        Markup.button.callback(`360 ${letters[category]}`, `${actionKey1}:360:${category}`),
                    ],
                    [
                        Markup.button.callback(`540 ${letters[category]}`, `${actionKey1}:540:${category}`),
                        Markup.button.callback(`720 ${letters[category]}`, `${actionKey1}:720:${category}`),
                    ],
                    [
                        Markup.button.callback(`1080 ${letters[category]}`, `${actionKey1}:1080:${category}`),
                        Markup.button.callback(`1440 ${letters[category]}`, `${actionKey1}:1440:${category}`),
                    ],
                    [Markup.button.callback("Boshqa", `${actionKey2}:${letters[category]}`)],
                ])
            );
        } else {
            await sendSummaryAndCompleteObject(ctx, sessionKey, keyboard, eggsDataKey, message1);
        } 
    } catch (error) {
        logger.error(error);
    }
};

module.exports.categoriesByTextObject = async (ctx, sessionKey, message, keyboard, type, eggsDataKey, eggsData = eggs, message2 = false, checkForEggs = false) => {
    try {
        if (!ctx.session.categories || type === 2) {
            ctx.session.categories = Object.keys(eggsData);
            ctx.session.currentCategoryIndex = 0;
            ctx.session[eggsDataKey] = {};
            ctx.session[sessionKey] = true;
        }
    
        if (sessionKey) {
            const category = ctx.session.categories[ctx.session.currentCategoryIndex];
    
            if (ctx.message && ctx.message.text && type != 2) {
                let amount;
                if (ctx.message.text.includes('.')) {
                    amount = parseFloat(ctx.message.text, 3);
                } else {
                    amount = parseInt(ctx.message.text, 10);
                }

                if (isNaN(amount) || amount < 0) {
                    await ctx.reply("Iltimos, to'g'ri son kiriting:");
                    return;
                }

                if (checkForEggs && ctx.session.currentEggs[category] < amount) {
                    await ctx.reply("Siz kiritgan tuxum soni bor tuxum sonidan katta");
                    return;
                }
    
                if (!ctx.session[eggsDataKey][category]) {
                    ctx.session[eggsDataKey][category] = 0;
                }
                ctx.session[eggsDataKey][category] += amount;
    
                ctx.session.currentCategoryIndex++;
            }
    
            if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
                const nextCategory = ctx.session.categories[ctx.session.currentCategoryIndex];
                await ctx.reply(message2 ? `Qancha ${letters[nextCategory]} kategoriya litr melanj?` : `Nechta ${letters[nextCategory]} kategoriya tuxum ${message}?`);
            } else {
                await sendSummaryAndCompleteObject(ctx, sessionKey, keyboard, eggsDataKey, message);
            }
        }
    } catch (error) {
        logger.error(error);
    }
};

const sendSummaryAndCompleteObject = async (ctx, sessionKey, keyboard, eggsDataKey, message) => {
    try {
        const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

        ctx.session[sessionKey] = false;

        const summaryMessage = Object.entries(ctx.session[eggsDataKey])
            .map(([category, amount]) => `${letters[category]}: ${amount}`)
            .join("\n");
    
        await ctx.reply(`${capitalize(message)} tuxum bo'yicha umumiy ma'lumot:\n\n${summaryMessage}`);
    
        await ctx.reply(
          "Tasdiqlaysizmi?",
          keyboard
        );
    } catch (error) {
        logger.error(error);
    }
};

module.exports.categoriesByButtonsArray = async (ctx, sessionKey, actionKey1, actionKey2, message1, message2, keyboard, type = 1, eggsDataKey) => { 
    try {
        if (!ctx.session.categories || type === 2) {
            ctx.session.categories = Object.keys(eggs);
            ctx.session.currentCategoryIndex = 0;
            ctx.session[eggsDataKey] = [];
        }
        
        const [action, amount, category] = ctx.match[0].split(":");
    
        if (action === actionKey1) {
            ctx.session[eggsDataKey].push({ category, amount: parseInt(amount, 10) });
            ctx.session.currentCategoryIndex++;
    
            // Delete the previous message
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
        } else if (action === actionKey2) {
            const category = ctx.session.categories[ctx.session.currentCategoryIndex];
    
            ctx.session[sessionKey] = true;
            await ctx.reply(`Nechta ${letters[category]} kategoriya tuxum ${message2} kiriting:`);
    
            // Delete the previous message
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
            return;
        }
    
        if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
            const category = ctx.session.categories[ctx.session.currentCategoryIndex];
    
            await ctx.reply(
                `Nechta ${letters[category]} kategoriya tuxum ${message1}?`,
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback("Keyingisi", `${actionKey1}:0:${category}`),
                    ],
                    [
                        Markup.button.callback(`180 ${letters[category]}`, `${actionKey1}:180:${category}`),
                        Markup.button.callback(`360 ${letters[category]}`, `${actionKey1}:360:${category}`),
                    ],
                    [
                        Markup.button.callback(`540 ${letters[category]}`, `${actionKey1}:540:${category}`),
                        Markup.button.callback(`720 ${letters[category]}`, `${actionKey1}:720:${category}`),
                    ],
                    [
                        Markup.button.callback(`1080 ${letters[category]}`, `${actionKey1}:1080:${category}`),
                        Markup.button.callback(`1440 ${letters[category]}`, `${actionKey1}:1440:${category}`),
                    ],
                    [Markup.button.callback("Boshqa", `${actionKey2}:${letters[category]}`)],
                ])
            );
        } else {
            await sendSummaryAndCompleteArray(ctx, sessionKey, keyboard, eggsDataKey, message1);
        } 
    } catch (error) {
        logger.error(error);
    }
};

module.exports.categoriesByTextArray = async (ctx, sessionKey, message, keyboard, type, eggsDataKey) => {
    try {
        if (!ctx.session.categories || type === 2) {
            ctx.session.categories = Object.keys(eggs);
            ctx.session.currentCategoryIndex = 0;
            ctx.session[eggsDataKey] = [];
            ctx.session[sessionKey] = true;
        }
    
        if (sessionKey) {
            const category = ctx.session.categories[ctx.session.currentCategoryIndex];
    
            if (ctx.message && ctx.message.text) {
                const amount = parseInt(ctx.message.text, 10);
                if (isNaN(amount) || amount < 0) {
                    await ctx.reply("Iltimos, to’g’ri son kiriting:");
                    return;
                }
    
                ctx.session[eggsDataKey].push({ category, amount });
                ctx.session.currentCategoryIndex++;
            }
    
            if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
                const nextCategory = ctx.session.categories[ctx.session.currentCategoryIndex];
                await ctx.reply(`Nechta ${nextCategory} kategoriya tuxum ${message}?`);
            } else {
                await sendSummaryAndCompleteArray(ctx, sessionKey, keyboard, eggsDataKey, message);
            }
        }
    } catch (error) {
        logger.error(error);
    }
};

const sendSummaryAndCompleteArray = async (ctx, sessionKey, keyboard, eggsDataKey, message) => {
    try {
        const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

        ctx.session[sessionKey] = false;

        const summaryMessage = ctx.session[eggsDataKey]
            .map(({ category, amount }) => `${letters[category]}: ${amount}`)
            .join("\n");
    
        await ctx.reply(`${capitalize(message)} tuxum bo'yicha umumiy ma'lumot:\n\n${summaryMessage}`);
    
        await ctx.reply(
          "Tasdiqlaysizmi?",
          keyboard
        );
    } catch (error) {
        logger.error(error);
    }
};

module.exports.saveEggs = async (ctx, eggsKey, eggsDataKey) => {
    try {
        const checkList = {

        }

        const activityResponse = await axios.get(
            ctx.session.user.userType === "warehouse" ? `/${ctx.session.user.userType}/activity/today/` : `/${ctx.session.user.userType}/activity/today/${ctx.session.user.phone_num}`,
            {
                headers: {
                    "x-user-telegram-chat-id": ctx.chat.id,
                },
            }
        );
        const activity = activityResponse.data;
        
        const updatedActivity = activity;
        updatedActivity[eggsKey] = ctx.session[eggsDataKey];
    } catch (error) {
        logger.error(error);
    }
}