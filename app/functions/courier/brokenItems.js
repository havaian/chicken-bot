// const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logging");

const { sendIncisionItems } = require("./incision");
const { sendMelange } = require("./melange");
const { sendDayFinished } = require("./finishDay");

// const nonZero = require("../general/non-zero");
// let items = "";

// const letters = require("../data/btnEmojis");

// const sessionKey = "awaitingBrokenItems";
// const itemsDataKey = "itemsBrokenData";

// const promptBroken = async (ctx, type) => {
  // items = nonZero(ctx.session.currentItems);
  // if (!ctx.session.categories || type === 2) {
  //   ctx.session.categories = Object.keys(items);
  //   ctx.session.currentCategoryIndex = 0;
  //   ctx.session[itemsDataKey] = {};
  //   ctx.session[sessionKey] = true;
  // }

  // if (sessionKey) {
  //   const category = ctx.session.categories[ctx.session.currentCategoryIndex];

  //   if (ctx.message && ctx.message.text && type != 2) {
  //     const amount = parseInt(ctx.message.text, 10);
  //     if (isNaN(amount) || amount < 0) {
  //       await ctx.reply("Iltimos, to’g’ri son kiriting:");
  //       return;
  //     }

  //     if (!ctx.session[itemsDataKey][category]) {
  //       ctx.session[itemsDataKey][category] = 0;
  //     }
  //     ctx.session[itemsDataKey][category] += amount;

  //     ctx.session.currentCategoryIndex++;
  //   }

  //   if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
  //     const nextCategory = ctx.session.categories[ctx.session.currentCategoryIndex];
  //     await ctx.reply(`Nechta ${letters[nextCategory]} kategoriya maxsulot singan?`);
  //   } else {
  //     await confirmBrokenItems(ctx);
  //   }
  // }
// }

exports.sendBrokenItems = async (ctx) => {
  try {
    // Get today's activity for the courier
    const courierActivityResponse = await axios.get(
      `/courier/activity/today/${ctx.session.user.phone_num}`,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );
    const courierActivity = courierActivityResponse.data;

    ctx.session.currentItems = courierActivity.current || {};

    await sendIncisionItems(ctx);
    // await sendMelange(ctx);
    // await sendDayFinished(ctx);
//     const type = ((ctx?.match && ctx?.match[0] === "confirm-broken-items-no") || typeof ctx.session[itemsDataKey] === "undefined") ? 2 : 1;

//     if (type === 2) {
//       await ctx.reply(`Singan maxsulotlar sonini kiriting`,
//         Markup.keyboard([
//           ["Bekor qilish ❌"]
//         ]));
//     }

//     promptBroken(ctx, type);
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Singan maxsulotlar qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

// const confirmBrokenItems = async (ctx) => {
//   try {
//     let amountMsg = "";

//     for (let y in Object.keys(ctx.session[itemsDataKey])) {
//       const x = Object.keys(ctx.session[itemsDataKey])[y];
//       amountMsg += `${letters[x]}: ${ctx.session[itemsDataKey][x]}\n`
//     }

//     await ctx.reply(`Singan maxsulotlar\n\n${amountMsg}\n\n`);
//     await ctx.reply(`Singan maxsulot kiritilganini tasdiqlaysizmi?`,
//       Markup.inlineKeyboard([
//         [Markup.button.callback("Ha ✅", "confirm-broken-items-yes"),
//         Markup.button.callback("Yo’q ❌", "confirm-broken-items-no")],
//       ])
//     );
//   } catch (error) {
//     logger.error(error);
//     await ctx.reply(
//       "Singan maxsulotlar qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
//     );
//   }
// };

// exports.addBrokenItems = async (ctx) => {
//   try {
//     // Get today's activity for the courier
//     const courierActivityResponse = await axios.get(
//       `/courier/activity/today/${ctx.session.user.phone_num}`,
//       {
//         headers: {
//           "x-user-telegram-chat-id": ctx.chat.id,
//         },
//       }
//     );
//     const courierActivity = courierActivityResponse.data;

//     const current = courierActivity.current;

//     for (let y in Object.keys(ctx.session[itemsDataKey])) {
//       const x = Object.keys(ctx.session[itemsDataKey])[y];
      
//       // If current[x] is not defined, set it to 0
//       if (typeof current[x] === 'undefined') {
//         current[x] = 0;
//       }

//       current[x] = current[x] - ctx.session[itemsDataKey][x];
//     }

//     // Update courier"s activity with broken items
//     const updatedCourierActivity = {
//       ...courierActivity,
//       current: courierActivity.current,
//       broken: ctx.session[itemsDataKey],
//     };

//     await axios.put(
//       `/courier/activity/${courierActivity._id}`,
//       updatedCourierActivity,
//       {
//         headers: {
//           "x-user-telegram-chat-id": ctx.chat.id,
//         },
//       }
//     );

//     // Delete the previous message
//     await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

//     ctx.session[itemsDataKey] = {};
//     ctx.session.categories = null;
//     ctx.session.currentCategoryIndex = null;
//     ctx.session.awaitingBrokenItems = false;

//     await sendIncisionItems(ctx);
//   } catch (error) {
//     logger.error(error);
//     await ctx.reply(
//       "Singan maxsulotlar qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
//     );
//   }
// };
