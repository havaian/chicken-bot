const axios = require("../../axios");
const { Markup } = require("telegraf");

const cancel = require("../general/cancel");

const { logger, readLog } = require("../../utils/logging");
const items = { 
  "D1": 960,
  "D2": 990
};
const letters = require("../data/btnEmojis");

const sessionKey = "awaitingIntakeItems";
const itemsDataKey = "itemsIntakeData";

const report = require("./report");

module.exports.promptItemImporter = async (ctx) => {
  try {
    const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-intake-items-no";

    if (deleteMsg) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    }

    const response = await axios.get(`/importer/all`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });

    const importers = response.data;
    ctx.session[itemsDataKey] = undefined;

    let message = "Fabrikani ro’yxatdan tanlang:\n";
    const buttons = importers.map((importer, index) => {
      message += `${index + 1}. ${importer.full_name}\n`;
      return Markup.button.callback(
        `${index + 1}`,
        `choose-importer:${importer._id}:${importer.full_name}`
      );
    });

    // Create rows of 5 buttons each
    const buttonRows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      buttonRows.push(buttons.slice(i, i + 5));
    }

    await ctx.reply(
      message,
      Markup.inlineKeyboard([
        ...buttonRows,
        [Markup.button.callback("Bekor qilish ❌", "cancel")],
      ])
    );
  } catch (error) {
    logger.error(error);
    await ctx.reply("Maxsulot fabrikasini ko’rsatishda xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports.handleItemImporter = async (ctx) => {
  try {
    const [action, importerId, importerName] = ctx.match[0].split(':');
    ctx.session.selectedImporter = { importerId, importerName };
    const intakeTime = new Date().toLocaleString();
    ctx.session.intakeTime = intakeTime;
    this.sendIntakeItems(ctx);
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
}

module.exports.promptItemIntake = async (ctx, type) => {
  try {
    if (!ctx.session.categories || type === 2) {
      ctx.session.categories = Object.keys(items);
      ctx.session.currentCategoryIndex = 0;
      ctx.session[itemsDataKey] = {};
      ctx.session[sessionKey] = true;
    }

    if (sessionKey) {
      const category = ctx.session.categories[ctx.session.currentCategoryIndex];

      if (ctx.message && ctx.message.text && type != 2) {
        const amount = parseInt(ctx.message.text, 10);
        if (isNaN(amount) || amount < 0) {
          await ctx.reply("Iltimos, to’g’ri son kiriting:");
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
        await ctx.reply(`Nechta ${letters[nextCategory]} kategoriya maxsulot kirim bo’ldi?`);
      } else {
        await confirmIntakeItems(ctx);
      }
    }
  } catch (error) {
    logger.error(error);
    await ctx.reply("Olingdan maxsulot sonini kiritishda xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports.sendIntakeItems = async (ctx) => {
  try {
    const type = ((ctx?.match && ctx?.match[0] === "confirm-intake-items-no") || typeof ctx.session[itemsDataKey] === "undefined") ? 2 : 1;

    if (type === 2) {
      await ctx.reply(`Maxsulot kirimi sonini kiriting`,
        Markup.keyboard([
          ["Bekor qilish ❌"]
        ]));
    }

    this.promptItemIntake(ctx, type);
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Maxsulot kirimini qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

const confirmIntakeItems = async (ctx) => {
  try {
    let amountMsg = "";

    for (let y in Object.keys(ctx.session[itemsDataKey])) {
      const x = Object.keys(ctx.session[itemsDataKey])[y];
      amountMsg += `${letters[x]}: ${ctx.session[itemsDataKey][x]}\n`
    }

    ctx.session.awaitingIntakeItems = false;

    await ctx.reply(`Maxsulot kirimi\n\n${amountMsg}\n\n`);
    await ctx.reply(`Maxsulot kirimini kiritilganini tasdiqlaysizmi?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Ha ✅", "confirm-intake-items-yes")],
        [Markup.button.callback("Yo’q ❌", "confirm-intake-items-no")],
      ])
    );
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Maxsulot kirimini qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

exports.addIntakeItems = async (ctx) => {
  try {
    const { importerId, importerName } = ctx.session.selectedImporter;
    const { intakeTime } = ctx.session;
    const response = await axios.get(`/warehouse/activity/today`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const warehouseActivity = response.data;

    const importerResponse = await axios.get(`/importer/activity/today/${importerId}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const importerActivity = importerResponse.data;

    const warehouseCurrent = warehouseActivity.current || {};
    const importerCurrent = importerActivity.amount || {};

    for (let y in Object.keys(ctx.session[itemsDataKey])) {
      const x = Object.keys(ctx.session[itemsDataKey])[y];

      // If current[x] is not defined, set it to 0
      if (typeof warehouseCurrent[x] === 'undefined') {
        warehouseCurrent[x] = 0;
      }

      warehouseCurrent[x] = warehouseCurrent[x] + ctx.session[itemsDataKey][x];
      importerCurrent[x] = ctx.session[itemsDataKey][x];
    }

    const itemsReceived = ctx.session[itemsDataKey];

    const updatedWarehouseActivity = {
      ...warehouseActivity,
      current: warehouseCurrent,
      accepted: [
        ...warehouseActivity.accepted,
        { importerId, importerName, itemsReceived, date: intakeTime }
      ],
    };

    await axios.put(
      `/warehouse/activity/${warehouseActivity._id}`,
      updatedWarehouseActivity,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );

    const importerUpdate = {
      amount: ctx.session[itemsDataKey],
      date: intakeTime,
    };

    await axios.put(
      `/importer/activity/${importerActivity._id}`,
      importerUpdate,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );

    // Delete the previous message
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    
    await report(updatedWarehouseActivity, ctx, "Maxsulot kirimi", true);

    await cancel(ctx, "Maxsulot kirimi qabul qilindi");

    ctx.session[itemsDataKey] = {};
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Maxsulot kirimini qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};