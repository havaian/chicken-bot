const axios = require("../../axios");
const { Markup } = require("telegraf");

const cancel = require("../general/cancel");

const { logger, readLog } = require("../../utils/logging");

module.exports.promptEggImporter = async (ctx) => {
  try {
    const response = await axios.get(`/importer/all`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });

    const importers = response.data;

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
        [Markup.button.callback("Bekor qilish", "cancel")],
      ])
    );
  } catch (error) {
    logger.info(error);
    ctx.reply("Tuxum fabrikasini ko’rsatishda xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports.promptEggIntake = async (ctx) => {
  try {
    const [action, importerId, importerName] = ctx.match;
    ctx.session.selectedImporter = { importerId, importerName };

    ctx.session.awaitingEggIntake = true;

    await ctx.reply(
      "Tuxum sonini kiriting",
      Markup.keyboard([
        ["Bekor qilish"]
      ]).resize().oneTime()
    );

    // Delete the previous message
    await ctx.deleteMessage();
  } catch (error) {
    logger.info(error);
    ctx.reply("Olingdan tuxum sonini kiritishda xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports.handleEggIntake = async (ctx) => {
  try {
    const { importerName } = ctx.session.selectedImporter;
    
    if (isNaN(ctx.message.text)) {
      await ctx.reply("Iltimos, to’g’ri tuxum miqdorini kiriting:",
        Markup.keyboard([
          ["Bekor qilish"]
        ]).resize().oneTime()
      );
      return;
    }

    const eggsReceived = parseInt(ctx.message.text, 10);
    const intakeTime = new Date().toLocaleString();
    ctx.session.eggsReceived = { amount: eggsReceived, date: intakeTime };

    await ctx.reply(
      `Siz ${intakeTime}da ${eggsReceived} dona tuxumni ${importerName}dan qabul qilganingizni tasdiqlaysizmi?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Tasdiqlash", "confirm-egg-intake")],
        [Markup.button.callback("Bekor qilish", "cancel")],
      ])
    );

    ctx.session.awaitingEggIntake = false;
  } catch (error) {
    logger.info(error);
    await ctx.reply("Tuxum kirimini qabul qilishda xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports.confirmEggIntake = async (ctx) => {
  const { amount, date } = ctx.session.eggsReceived;
  const { importerId, importerName } = ctx.session.selectedImporter;

  try {
    const response = await axios.get(`/warehouse/activity/today`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const warehouseActivity = response.data;

    const importer = await axios.get(`/importer/activity/today`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });

    const importerActivity = importer.data;

    // Ensure accepted_from is an array
    const acceptedFromArray = Array.isArray(warehouseActivity.accepted_from)
      ? warehouseActivity.accepted_from
      : [];

    const updatedWarehouseActivity = {
      ...warehouseActivity,
      current: warehouseActivity.current + amount,
      remained: warehouseActivity.current + amount,
      accepted: (warehouseActivity.accepted || 0) + amount,
      accepted_from: [...acceptedFromArray, { importerId, importerName, amount, date }],
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

    importerUpdate = {
      amount: amount,
      date: date,
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

    cancel(ctx, `${amount} tuxum ${date} da qabul qilindi va qoldiq tuxum miqdoriga qo’shildi.`);
    
    // Delete the previous message
    await ctx.deleteMessage();
  } catch (error) {
    logger.info(error);
    await ctx.reply("Tuxum kirimini tasdiqlashda xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports.cancelEggIntake = async (ctx) => {
  try {
    cancel(ctx, "Tuxum kirimi bekor qilindi.");
  
    // Delete the previous message
    await ctx.deleteMessage();
  } catch (error) {
    logger.info(error);
    await ctx.reply("Tuxum kirimini rad etishda xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};
