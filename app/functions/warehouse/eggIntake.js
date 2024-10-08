const axios = require("../../axios");
const { Markup } = require("telegraf");

const cancel = require("../general/cancel");

const { logger, readLog } = require("../../utils/logging");
const eggs = { 
  "D1": 960,
  "D2": 990
};
const letters = require("../data/btnEmojis");

const sessionKey = "awaitingIntakeEggs";
const eggsDataKey = "eggsIntakeData";

const report = require("./report");

module.exports.promptEggImporter = async (ctx) => {
  try {
    const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-intake-eggs-no";

    if (deleteMsg) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    }

    const response = await axios.get(`/importer/all`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });

    const importers = response.data;
    ctx.session[eggsDataKey] = undefined;

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
    await ctx.reply("Tuxum fabrikasini ko’rsatishda xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports.handleEggImporter = async (ctx) => {
  try {
    const [action, importerId, importerName] = ctx.match[0].split(':');
    ctx.session.selectedImporter = { importerId, importerName };
    const intakeTime = new Date().toLocaleString();
    ctx.session.intakeTime = intakeTime;
    this.sendIntakeEggs(ctx);
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
}

module.exports.promptEggIntake = async (ctx, type) => {
  try {
    if (!ctx.session.categories || type === 2) {
      ctx.session.categories = Object.keys(eggs);
      ctx.session.currentCategoryIndex = 0;
      ctx.session[eggsDataKey] = {};
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

        if (!ctx.session[eggsDataKey][category]) {
          ctx.session[eggsDataKey][category] = 0;
        }
        ctx.session[eggsDataKey][category] += amount;

        ctx.session.currentCategoryIndex++;
      }

      if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
        const nextCategory = ctx.session.categories[ctx.session.currentCategoryIndex];
        await ctx.reply(`Nechta ${letters[nextCategory]} kategoriya tuxum kirim bo’ldi?`);
      } else {
        await confirmIntakeEggs(ctx);
      }
    }
  } catch (error) {
    logger.error(error);
    await ctx.reply("Olingdan tuxum sonini kiritishda xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports.sendIntakeEggs = async (ctx) => {
  try {
    const type = ((ctx?.match && ctx?.match[0] === "confirm-intake-eggs-no") || typeof ctx.session[eggsDataKey] === "undefined") ? 2 : 1;

    if (type === 2) {
      await ctx.reply(`Tuxum kirimi sonini kiriting`,
        Markup.keyboard([
          ["Bekor qilish ❌"]
        ]));
    }

    this.promptEggIntake(ctx, type);
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Tuxum kirimini qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

const confirmIntakeEggs = async (ctx) => {
  try {
    let amountMsg = "";

    for (let y in Object.keys(ctx.session[eggsDataKey])) {
      const x = Object.keys(ctx.session[eggsDataKey])[y];
      amountMsg += `${letters[x]}: ${ctx.session[eggsDataKey][x]}\n`
    }

    ctx.session.awaitingIntakeEggs = false;

    await ctx.reply(`Tuxum kirimi\n\n${amountMsg}\n\n`);
    await ctx.reply(`Tuxum kirimini kiritilganini tasdiqlaysizmi?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Ha ✅", "confirm-intake-eggs-yes")],
        [Markup.button.callback("Yo’q ❌", "confirm-intake-eggs-no")],
      ])
    );
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Tuxum kirimini qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

exports.addIntakeEggs = async (ctx) => {
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

    for (let y in Object.keys(ctx.session[eggsDataKey])) {
      const x = Object.keys(ctx.session[eggsDataKey])[y];

      // If current[x] is not defined, set it to 0
      if (typeof warehouseCurrent[x] === 'undefined') {
        warehouseCurrent[x] = 0;
      }

      warehouseCurrent[x] = warehouseCurrent[x] + ctx.session[eggsDataKey][x];
      importerCurrent[x] = ctx.session[eggsDataKey][x];
    }

    const eggsReceived = ctx.session[eggsDataKey];

    const updatedWarehouseActivity = {
      ...warehouseActivity,
      current: warehouseCurrent,
      accepted: [
        ...warehouseActivity.accepted,
        { importerId, importerName, eggsReceived, date: intakeTime }
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
      amount: ctx.session[eggsDataKey],
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
    
    await report(updatedWarehouseActivity, ctx, "Tuxum kirimi", true);

    await cancel(ctx, "Tuxum kirimi qabul qilindi");

    ctx.session[eggsDataKey] = {};
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Tuxum kirimini qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};