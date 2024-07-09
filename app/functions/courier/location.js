const axios = require("../../axios");
const { Markup } = require("telegraf");
const chooseBuyer = require("./chooseBuyer");

const { logger, readLog } = require("../../utils/logs");

// module.exports = async (ctx) => {
//     const { latitude, longitude } = ctx.message.location;

//     try {
//         const response = await axios.post('/buyer/closest-location', {
//             lat: latitude,
//             lng: longitude
//         }, {
//             headers: {
//                 'x-user-telegram-chat-id': ctx.chat.id
//             }
//         });

//         const buyers = response.data;
//         if (buyers.length === 0) {
//             await ctx.reply('Siz yuborgan joylashuv bo\'yicha klient topilmadi.');
//             return;
//         }

//         let message = "Klientni tanlang:\n";
//         const buttons = buyers.map((buyer, index) => {
//             message += `${index + 1}. ${buyer.full_name}\n`;
//             return Markup.button.callback(`${index + 1}`, `choose-buyer:${buyer._id}`);
//         });

//         // Create rows of 5 buttons each
//         const buttonRows = [];
//         for (let i = 0; i < buttons.length; i += 5) {
//             buttonRows.push(buttons.slice(i, i + 5));
//         }

//         await ctx.reply(message, Markup.inlineKeyboard([
//             ...buttonRows,
//             [Markup.button.callback('Bekor qilish', 'cancel')]
//         ]));
//     } catch (error) {
//         logger.info(error);
//         await ctx.reply('Klientlarni topishda xatolik yuz berdi. Qayta urunib ko\'ring');
//     }
// };

module.exports = async (ctx) => {
    try {
        if (ctx.match) {
            // Delete the previous message
            await ctx.deleteMessage();

            ctx.session.match = ctx.match;
            await ctx.reply('Joylashuvni yuboring.', Markup.keyboard([
                [{ text: "Joylashuvni yuborish", request_location: true }],
                ['Bekor qilish']
            ]).resize().oneTime());
        } else if (ctx.message && ctx.message.text) {
            const searchData = { client_name: ctx.message.text };
            const response = await axios.post("/buyer/search", searchData, {
                headers: {
                    'x-user-telegram-chat-id': ctx.chat.id
                }
            });
    
            const buyers = response.data;
            if (buyers.length === 0) {
                await ctx.reply('Siz yuborgan nom bo\'yicha klient topilmadi.');
                return;
            }
    
            let message = "Klientni tanlang:\n";
            const buttons = buyers.map((buyer, index) => {
                message += `${index + 1}. ${buyer.full_name}\n`;
                return Markup.button.callback(`${index + 1}`, `location-buyer:${buyer._id}`);
            });
    
            // Create rows of 5 buttons each
            const buttonRows = [];
            for (let i = 0; i < buttons.length; i += 5) {
                buttonRows.push(buttons.slice(i, i + 5));
            }
    
            await ctx.reply(message, Markup.inlineKeyboard([
                ...buttonRows,
                [Markup.button.callback('Bekor qilish', 'cancel')]
            ]));
        } else if (ctx.message && ctx.message.location) {
            const { latitude, longitude } = ctx.message.location;
            ctx.match = ctx.session.match;

            const buyer = await axios.get(`/buyer/${ctx.match[1]}`, {
                headers: {
                    'x-user-telegram-chat-id': ctx.chat.id
                }
            });

            const locations = buyer.data.locations || [];

            const response = await axios.put(`/buyer/${ctx.match[1]}`, {
                locations: [
                    ...locations,
                    {
                        lat: latitude,
                        lng: longitude
                    }
                ]
            }, {
                headers: {
                    'x-user-telegram-chat-id': ctx.chat.id
                }
            });
    
            chooseBuyer(ctx);
        }
    } catch (error) {
        logger.info(error);
        await ctx.reply('Klientlarni topishda xatolik yuz berdi. Qayta urunib ko\'ring');
    }
};