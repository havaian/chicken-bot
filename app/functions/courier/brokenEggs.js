// const { Markup } = require("telegraf");
const axios = require("../../axios");

// const { logger, readLog } = require("../../utils/logging");

const { sendIncisionEggs } = require("./incision");
const { sendMelange } = require("./melange");
const { sendDayFinished } = require("./finishDay");

// const nonZero = require("../general/non-zero");
// let eggs = "";

// const letters = require("../data/btnEmojis");

// const sessionKey = "awaitingBrokenEggs";
// const eggsDataKey = "eggsBrokenData";

// const promptBroken = async (ctx, type) => {
  // eggs = nonZero(ctx.session.currentEggs);
  // if (!ctx.session.categories || type === 2) {
  //   ctx.session.categories = Object.keys(eggs);
  //   ctx.session.currentCategoryIndex = 0;
  //   ctx.session[eggsDataKey] = {};
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

  //     if (!ctx.session[eggsDataKey][category]) {
  //       ctx.session[eggsDataKey][category] = 0;
  //     }
  //     ctx.session[eggsDataKey][category] += amount;

  //     ctx.session.currentCategoryIndex++;
  //   }

  //   if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
  //     const nextCategory = ctx.session.categories[ctx.session.currentCategoryIndex];
  //     await ctx.reply(`Nechta ${letters[nextCategory]} kategoriya tuxum singan?`);
  //   } else {
  //     await confirmBrokenEggs(ctx);
  //   }
  // }
// }

exports.sendBrokenEggs = async (ctx) => {
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

    ctx.session.currentEggs = courierActivity.current || {};

    await sendIncisionEggs(ctx);
    // await sendMelange(ctx);
    // await sendDayFinished(ctx);
//     const type = ((ctx?.match && ctx?.match[0] === "confirm-broken-eggs-no") || typeof ctx.session[eggsDataKey] === "undefined") ? 2 : 1;

//     if (type === 2) {
//       await ctx.reply(`Singan tuxumlar sonini kiriting`,
//         Markup.keyboard([
//           ["Bekor qilish ❌"]
//         ]));
//     }

//     promptBroken(ctx, type);
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Singan tuxumlar qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

// const confirmBrokenEggs = async (ctx) => {
//   try {
//     let amountMsg = "";

//     for (let y in Object.keys(ctx.session[eggsDataKey])) {
//       const x = Object.keys(ctx.session[eggsDataKey])[y];
//       amountMsg += `${letters[x]}: ${ctx.session[eggsDataKey][x]}\n`
//     }

//     await ctx.reply(`Singan tuxumlar\n\n${amountMsg}\n\n`);
//     await ctx.reply(`Singan tuxum kiritilganini tasdiqlaysizmi?`,
//       Markup.inlineKeyboard([
//         [Markup.button.callback("Ha ✅", "confirm-broken-eggs-yes"),
//         Markup.button.callback("Yo’q ❌", "confirm-broken-eggs-no")],
//       ])
//     );
//   } catch (error) {
//     logger.info(error);
//     await ctx.reply(
//       "Singan tuxumlar qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
//     );
//   }
// };

// exports.addBrokenEggs = async (ctx) => {
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

//     for (let y in Object.keys(ctx.session[eggsDataKey])) {
//       const x = Object.keys(ctx.session[eggsDataKey])[y];
      
//       // If current[x] is not defined, set it to 0
//       if (typeof current[x] === 'undefined') {
//         current[x] = 0;
//       }

//       current[x] = current[x] - ctx.session[eggsDataKey][x];
//     }

//     // Update courier"s activity with broken eggs
//     const updatedCourierActivity = {
//       ...courierActivity,
//       current: courierActivity.current,
//       broken: ctx.session[eggsDataKey],
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
//     await ctx.deleteMessage();

//     ctx.session[eggsDataKey] = {};
//     ctx.session.categories = null;
//     ctx.session.currentCategoryIndex = null;
//     ctx.session.awaitingBrokenEggs = false;

//     await sendIncisionEggs(ctx);
//   } catch (error) {
//     logger.info(error);
//     await ctx.reply(
//       "Singan tuxumlar qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
//     );
//   }
// };
