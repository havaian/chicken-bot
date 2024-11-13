const { Markup } = require("telegraf");
const axios = require("../../axios");
const items = require("../data/prices");
const { logger } = require("../../utils/logging");
const letters = require("../data/btnEmojis");

module.exports.categoriesByButtonsObject = async (ctx, sessionKey, actionKey1, actionKey2, message1, message2, keyboard, type = 1, itemsDataKey) => { 
    try {
        if (!ctx.session.categories || type === 2) {
            ctx.session.categories = Object.keys(items);
            ctx.session.currentCategoryIndex = 0;
            ctx.session[itemsDataKey] = {};
        }
        
        const [action, amount, category] = ctx.match[0].split(":");
    
        if (action === actionKey1) {
            if (!ctx.session[itemsDataKey][category]) {
                ctx.session[itemsDataKey][category] = 0;
            }
            ctx.session[itemsDataKey][category] += parseInt(amount, 10);
    
            ctx.session.currentCategoryIndex++;
    
            // Delete the previous message
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
        } else if (action === actionKey2) {
            const category = ctx.session.categories[ctx.session.currentCategoryIndex];
    
            ctx.session[sessionKey] = true;
            await ctx.reply(`Nechta ${letters[category]} kategoriya maxsulot ${message2} kiriting:`);
    
            // Delete the previous message
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
            return;
        }
    
        if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
            const category = ctx.session.categories[ctx.session.currentCategoryIndex];
    
            await ctx.reply(
                `Nechta ${letters[category]} kategoriya maxsulot ${message1}?`,
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
            await sendSummaryAndCompleteObject(ctx, sessionKey, keyboard, itemsDataKey, message1);
        } 
    } catch (error) {
        logger.error(error);
    }
};

module.exports.categoriesByTextObject = async (ctx, sessionKey, message, keyboard, type, itemsDataKey, itemsData = items, message2 = false, checkForItems = false) => {
    try {
        if (!ctx.session.categories || type === 2) {
            ctx.session.categories = Object.keys(itemsData);
            ctx.session.currentCategoryIndex = 0;
            ctx.session[itemsDataKey] = {};
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

                if (checkForItems && ctx.session.currentItems[category] < amount) {
                    await ctx.reply("Siz kiritgan maxsulot soni bor maxsulot sonidan katta");
                    return;
                }
    
                if (!ctx.session[itemsDataKey][category]) {
                    ctx.session[itemsDataKey][category] = 0;
                }
                ctx.session[itemsDataKey][category] += amount;
    
                ctx.session.currentCategoryIndex++;
            }
    
            if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
                const nextCategory = ctx.session.categories[ctx.session.currentCategoryIndex];
                await ctx.reply(message2 ? `Qancha ${letters[nextCategory]} kategoriya litr melanj?` : `Nechta ${letters[nextCategory]} kategoriya maxsulot ${message}?`);
            } else {
                await sendSummaryAndCompleteObject(ctx, sessionKey, keyboard, itemsDataKey, message);
            }
        }
    } catch (error) {
        logger.error(error);
    }
};

const sendSummaryAndCompleteObject = async (ctx, sessionKey, keyboard, itemsDataKey, message) => {
    try {
        const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

        ctx.session[sessionKey] = false;

        const summaryMessage = Object.entries(ctx.session[itemsDataKey])
            .map(([category, amount]) => `${letters[category]}: ${amount}`)
            .join("\n");
    
        await ctx.reply(`${capitalize(message)} maxsulot bo'yicha umumiy ma'lumot:\n\n${summaryMessage}`);
    
        await ctx.reply(
          "Tasdiqlaysizmi?",
          keyboard
        );
    } catch (error) {
        logger.error(error);
    }
};

module.exports.categoriesByButtonsArray = async (ctx, sessionKey, actionKey1, actionKey2, message1, message2, keyboard, type = 1, itemsDataKey) => { 
    try {
        if (!ctx.session.categories || type === 2) {
            ctx.session.categories = Object.keys(items);
            ctx.session.currentCategoryIndex = 0;
            ctx.session[itemsDataKey] = [];
        }
        
        const [action, amount, category] = ctx.match[0].split(":");
    
        if (action === actionKey1) {
            ctx.session[itemsDataKey].push({ category, amount: parseInt(amount, 10) });
            ctx.session.currentCategoryIndex++;
    
            // Delete the previous message
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
        } else if (action === actionKey2) {
            const category = ctx.session.categories[ctx.session.currentCategoryIndex];
    
            ctx.session[sessionKey] = true;
            await ctx.reply(`Nechta ${letters[category]} kategoriya maxsulot ${message2} kiriting:`);
    
            // Delete the previous message
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
            return;
        }
    
        if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
            const category = ctx.session.categories[ctx.session.currentCategoryIndex];
    
            await ctx.reply(
                `Nechta ${letters[category]} kategoriya maxsulot ${message1}?`,
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
            await sendSummaryAndCompleteArray(ctx, sessionKey, keyboard, itemsDataKey, message1);
        } 
    } catch (error) {
        logger.error(error);
    }
};

module.exports.categoriesByTextArray = async (ctx, sessionKey, message, keyboard, type, itemsDataKey) => {
    try {
        if (!ctx.session.categories || type === 2) {
            ctx.session.categories = Object.keys(items);
            ctx.session.currentCategoryIndex = 0;
            ctx.session[itemsDataKey] = [];
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
    
                ctx.session[itemsDataKey].push({ category, amount });
                ctx.session.currentCategoryIndex++;
            }
    
            if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
                const nextCategory = ctx.session.categories[ctx.session.currentCategoryIndex];
                await ctx.reply(`Nechta ${nextCategory} kategoriya maxsulot ${message}?`);
            } else {
                await sendSummaryAndCompleteArray(ctx, sessionKey, keyboard, itemsDataKey, message);
            }
        }
    } catch (error) {
        logger.error(error);
    }
};

const sendSummaryAndCompleteArray = async (ctx, sessionKey, keyboard, itemsDataKey, message) => {
    try {
        const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

        ctx.session[sessionKey] = false;

        const summaryMessage = ctx.session[itemsDataKey]
            .map(({ category, amount }) => `${letters[category]}: ${amount}`)
            .join("\n");
    
        await ctx.reply(`${capitalize(message)} maxsulot bo'yicha umumiy ma'lumot:\n\n${summaryMessage}`);
    
        await ctx.reply(
          "Tasdiqlaysizmi?",
          keyboard
        );
    } catch (error) {
        logger.error(error);
    }
};

module.exports.saveItems = async (ctx, itemsKey, itemsDataKey) => {
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
        updatedActivity[itemsKey] = ctx.session[itemsDataKey];
    } catch (error) {
        logger.error(error);
    }
}