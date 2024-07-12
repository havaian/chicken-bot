const axios = require("../../axios");
const { Markup } = require("telegraf");

const { logger, readLog } = require("../../utils/logs");

module.exports.promptEggImporter = async (ctx) => {
  try {
    const response = await axios.get(`/importer/all`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });

    const importers = response.data;

    let message = "Ro’yxatdan tanlang:\n";
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
    ctx.reply(
      "Tuxum import qiluvchilarni ko’rsatishda xatolik yuz berdi. Qayta urunib ko’ring."
    );
  }
};

module.exports.promptEggIntake = async (ctx) => {
  try {
    const { action, importerId, importerName } = ctx.match;
    ctx.session.selectedImporter = { importerId, importerName };

    ctx.session.awaitingEggIntake = true;

    await ctx.reply(
      "Nechta tuxum olindi?",
      Markup.inlineKeyboard([
        [Markup.button.callback("Bekor qilish", "cancel")],
      ])
    );

    // Delete the previous message
    await ctx.deleteMessage();
  } catch (error) {
    ctx.reply(
      "Olingdan tuxum sonini kiritishda xatolik yuz berdi. Qayta urunib ko’ring."
    );
  }
};

module.exports.handleEggIntake = async (ctx) => {
  try {
    if (isNaN(ctx.message.text)) {
      await ctx.reply("Iltimos, to’g’ri tuxum miqdorini kiriting:");
      return;
    }

    const eggsReceived = parseInt(ctx.message.text, 10);
    const intakeTime = new Date().toLocaleString();
    ctx.session.eggsReceived = { amount: eggsReceived, date: intakeTime };

    await ctx.reply(
      `Siz ${eggsReceived} tuxumni ${intakeTime}da qabul qilganingizni tasdiqlaysizmi?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Tasdiqlash", "confirm_egg_intake")],
        [Markup.button.callback("Bekor qilish", "cancel")],
      ])
    );
  } catch (error) {
    await ctx.reply(
      "Tuxum kirimini qabul qilishda xatolik yuz berdi. Qayta urunib ko’ring."
    );
  }
};

module.exports.confirmEggIntake = async (ctx) => {
  const { amount, time } = ctx.session.eggsReceived;
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

    // Ensure accepted_at is an array
    const acceptedAtArray = Array.isArray(warehouseActivity.accepted_at)
      ? warehouseActivity.accepted_at
      : [];

    const updatedWarehouseActivity = {
      ...warehouseActivity,
      current: warehouseActivity.current + amount,
      accepted: (warehouseActivity.accepted || 0) + amount,
      accepted_at: [...acceptedAtArray, { importerId, importerName, amount, time }],
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

    importerActivity = {
      ...importerActivity,
      amount: amount,
      date: time,
    };

    await axios.put(
      `/importer/${ctx.session.selectedImporter.importerId}`,
      importerActivity,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );

    await ctx.reply(
      `${amount} tuxum ${time} da qabul qilindi va qoldiq tuxum miqdoriga qo"shildi.`
    );
    ctx.session.awaitingEggIntake = false;
    ctx.session.eggsReceived = null;
    ctx.session.selectedImporter = null;

    // Delete the previous message
    await ctx.deleteMessage();
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Tuxum kirimini saqlashda xatolik yuz berdi. Qayta urunib ko’ring."
    );
  }
};

module.exports.cancelEggIntake = async (ctx) => {
  ctx.session.awaitingEggIntake = false;
  ctx.session.eggsReceived = null;
  ctx.session.selectedImporter = null;

  await ctx.reply("Tuxum kirimi bekor qilindi.");

  // Delete the previous message
  await ctx.deleteMessage();
};
