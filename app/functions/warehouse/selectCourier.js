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

const { logger, readLog } = require("../../utils/logs");

let botInstance = null;

const setBotInstance = (bot) => {
  botInstance = bot;
};

// Helper function to find group ID by phone number
const findGroupIdByPhoneNumber = (phoneNumber) => {
  for (const [groupId, phoneNumbers] of Object.entries(groups)) {
    if (phoneNumbers.includes(phoneNumber)) {
      return groupId;
    }
  }
  return null;
};

module.exports.promptCourier = async (ctx) => {
  try {
    ctx.session.selectedCourier = {};

    const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const warehouseActivity = warehouseActivityResponse.data;
    const couriersWithSecondTime = warehouseActivity.distributed_to.filter(dist => dist.second_time).map(dist => dist._id);

    const response = await axios.get("/courier/all", {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const couriers = response.data.filter(courier => !couriersWithSecondTime.includes(courier._id));

    if (couriers.length === 0) {
      await ctx.reply("Kuryerlar topilmadi.");
      return;
    }

    let message = "Kuryerni tanlang:\n";
    const buttons = couriers.map((courier, index) => {
      message += `${index + 1}. ${courier.car_num}, ${courier.full_name}\n`;
      return Markup.button.callback(
        `${index + 1}`,
        `select-courier:${courier._id}`
      );
    });

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

    await ctx.deleteMessage();
  } catch (error) {
    logger.info(error);
    await ctx.reply("Mashinalar topilmadi. Qayta urunib ko’ring");
  }
};

module.exports.promptCourierBroken = async (ctx) => {
  try {
    if (!ctx.session.selectedCourier || !ctx.session.selectedCourier._id) {
      const courierId = ctx.match[1];

      const courierResponse = await axios.get(`/courier/${courierId}`, {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      });
      const courier = courierResponse.data;

      ctx.session.selectedCourier = {};
      ctx.session.selectedCourier = { _id: courier._id, full_name: courier.full_name, car_num: courier.car_num };
      ctx.session.awaitingCourierBrokenEggs = true;
    }

    await ctx.reply(`${ctx.session.selectedCourier.car_num} (${ctx.session.selectedCourier.full_name}) mashinadagi singan tuxumlarni kiriting`,
      Markup.keyboard([
        ["Bekor qilish"]
      ]).resize().oneTime());

    await ctx.deleteMessage();
  } catch (error) {
    logger.info(error);
    await ctx.reply("Singan tuxumlarni kiritishda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.acceptCourierBroken = async (ctx) => {
  try {
    const { full_name, car_num } = ctx.session.selectedCourier;

    const amount = ctx.text;
    const amountInt = parseInt(amount, 10);
    ctx.session.selectedCourier.broken = amountInt;

    await ctx.reply(`${car_num} (${full_name}) mashinadan ${amountInt}ta singan tuxum olindi`);

    await ctx.reply("Tasdiqlaysizmi?",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Ha", "courier-broken-yes"),
          Markup.button.callback("Yo’q", "courier-broken-no"),
        ]
      ]));
  } catch (error) {
    logger.info(error);
    await ctx.reply("Kiritilgan singan tuxumlarni tasdiqlashda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.confirmCourierBroken = async (ctx) => {
  try {
    this.promptCourierRemained(ctx);
  } catch (error) {
    logger.info(error);
    await ctx.reply("Singan tuxumlarni saqlashda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.promptCourierRemained = async (ctx) => {
  try {
    const { full_name, car_num } = ctx.session.selectedCourier;
    ctx.session.awaitingCourierBrokenEggs = false;
    ctx.session.awaitingCourierRemainedEggs = true;
    await ctx.reply(`${car_num} (${full_name}) mashinadagi ostatkani kiriting`,
      Markup.keyboard([
        ["Bekor qilish"]
      ]).resize().oneTime());
    await ctx.deleteMessage();
  } catch (error) {
    logger.info(error);
    await ctx.reply("Mashinada qolgan tuxumda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.acceptCourierRemained = async (ctx) => {
  try {
    const { full_name, car_num } = ctx.session.selectedCourier;

    const amount = ctx.text;
    const amountInt = parseInt(amount, 10);
    ctx.session.selectedCourier.remained = amountInt;

    await ctx.reply(`${car_num} (${full_name}) mashinaga ${amountInt}ta ostatka tuxum qo’shildi.`);

    await ctx.reply("Tasdiqlaysizmi",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Ha", "courier-remained-yes"),
          Markup.button.callback("Yo’q", "courier-remained-no"),
        ]
      ]));
  } catch (error) {
    logger.info(error);
    await ctx.reply("Mashinada ostatka tuxumni kiritishda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.confirmCourierRemained = async (ctx) => {
  try {
    this.promptDistribution(ctx);
  } catch (error) {
    logger.info(error);
    await ctx.reply("Mashinada ostatka tuxumni saqlashda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.promptDistribution = async (ctx) => {
  try {
    const { full_name, car_num } = ctx.session.selectedCourier;
    ctx.session.awaitingCourierRemainedEggs = false;
    ctx.session.awaitingDistributedEggs = true;
    await ctx.reply(`${car_num} (${full_name}) mashinaga yuklangan tuxumlar sonini kiriting`,
      Markup.keyboard([
        ["Bekor qilish"]
      ]).resize().oneTime());
    await ctx.deleteMessage();
  } catch (error) {
    await ctx.reply("Mashinaga tuxum yuklashda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.acceptDistribution = async (ctx) => {
  try {
    const { _id, car_num, full_name } = ctx.session.selectedCourier;

    const amount = ctx.message.text;
    const amountInt = parseInt(amount, 10);
    ctx.session.selectedCourier.distribution = amountInt;

    await ctx.reply(`${car_num} (${full_name})\n\nMashinaga ${amountInt}ta tuxum yuklandi.`);

    await ctx.reply(
      "Tasdiqlaysizmi?",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Ha", `accept-distribution-yes`),
          Markup.button.callback("Yo’q", `accept-distribution-no`)
        ]
      ])
    );

    ctx.session.awaitingDistributedEggs = false;
    await ctx.deleteMessage();
  } catch (error) {
    logger.info(error);
    await ctx.reply("Mashinaga tuxum yuklashda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.confirmDistribution = async (ctx) => {
  try {
    await ctx.deleteMessage();
    this.promptCircleVideo(ctx);
  } catch (error) {
    logger.info(error);
    await ctx.reply("Mashinaga xabar yetkazishda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.promptCircleVideo = async (ctx) => {
  handleCircleVideo(ctx);
  // try {
  //   await ctx.reply("Iltimos, hisobot uchun dumaloq video yuboring.",
  //     Markup.keyboard([
  //         ["Bekor qilish"]
  //     ]).resize().oneTime());
  //   ctx.session.awaitingCircleVideoWarehouse = true;
  // } catch (error) {
  //   logger.info(error);
  //   await ctx.reply("Dumoloq videoda xatolik yuz berdi. Qayta urunib ko’ring",
  //     Markup.keyboard([
  //         ["Bekor qilish"]
  //     ]).resize().oneTime());
  // }
};

const handleCircleVideo = async (ctx) => {
  try {
    // if (!ctx.message.video_note || ctx.message.forward_from) {
    //   await ctx.reply("Iltimos, hisobot uchun dumaloq video yuboring.",
    //     Markup.keyboard([
    //         ["Bekor qilish"]
    //     ]).resize().oneTime());
    //   return;
    // }

    // if (ctx.message.video_note.duration < 5) {
    //   await ctx.reply("Hisobot uchun dumaloq video uzunligi 4 soniyadan kam bo‘lmasligi kerak.");
    //   return;
    // }

    const warehousePhoneNum = ctx.session.user.phone_num;

    // Find the group id by courier's phone number
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
      logger.info("selectCourier. Warehouse groupId not found:", groupId, !groupId);
      await ctx.reply("Guruh topilmadi. Qayta urunib ko‘ring.");
      return;
    }

    // // Forward the video to the group using message ID
    // const messageId = ctx.message.message_id;
    // await ctx.telegram.forwardMessage(groupId, ctx.chat.id, messageId);

    // Update warehouse activity and send confirmation message
    const { _id, full_name, car_num, distribution, broken, remained } = ctx.session.selectedCourier;

    const courierResponse = await axios.get(`/courier/${_id}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const courier = courierResponse.data;

    await botInstance.telegram.sendMessage(
      courier.telegram_chat_id,
      `Sizning xisobingizga ${distribution}ta tuxum qo’shildi. Mashinangizda ${broken}ta singan tuxum bor va ${remained}ta tuxum ostatka. Tasdiqlang.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Tasdiqlash", `courier-accept:${_id}:${distribution}:${broken}:${remained}`),],
        [Markup.button.callback("Rad etish", `courier-reject:${_id}:${distribution}:${broken}:${remained}`)],
      ])
    );

    await botInstance.telegram.sendMessage(
      groupId,
      `⚠️ Tasdiqlashni kutilmoqda\n\n${car_num} (${full_name}) mashinaga ${distribution}ta tuxum qo’shildi. Mashinada ${broken}ta singan tuxum bor va ${remained}ta tuxum ostatka.`
    );

    cancel(ctx, "Xabar kuryerga jo’natildi.");
  } catch (error) {
    logger.info(error);
    ctx.reply("Dumaloq video yuborishda xatolik yuz berdi. Qayta urunib ko‘ring.")
  }
};

module.exports.courierAccept = async (ctx) => {
  const [action, courierId, distribution, broken, remained] = ctx.match;
  const distributionInt = parseInt(distribution, 10);
  const brokenInt = parseInt(broken, 10);
  const remainedInt = parseInt(remained, 10);

  try {
    const courierResponse = await axios.get(
      `/courier/${courierId}`,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );
    const courier = courierResponse.data;

    const { full_name, car_num, phone_num } = courier;

    const courierActivityResponse = await axios.get(
      `/courier/activity/today/${courierId}`,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );
    const courierActivity = courierActivityResponse.data;

    const updatedCourierActivity = {
      ...courierActivity,
      current: courierActivity.current + distributionInt,
      accepted: courierActivity.accepted + distributionInt,
      accepted_today: true,
    };

    await axios.put(
      `/courier/activity/${courierActivity._id}`,
      updatedCourierActivity
    );

    const warehouseActivityResponse = await axios.get(
      "/warehouse/activity/today",
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );
    const warehouseActivity = warehouseActivityResponse.data;

    // Find and update the element in the distributed_to array
    let updated = false;
    const updatedDistributedTo = warehouseActivity.distributed_to.map((dist) => {
      if (dist._id === courierId) {
        updated = true;
        return { 
          ...dist, 
          eggs: distributionInt, 
          broken: brokenInt, 
          remained: remainedInt, 
          second_time: true 
        };
      }
      return dist;
    });

    // If no existing entry was updated, create a new one
    if (!updated) {
      updatedDistributedTo.push({
        _id: courierId,
        courier_name: full_name,
        eggs: distributionInt,
        broken: brokenInt,
        remained: remainedInt,
        time: new Date().toLocaleString(),
      });
    }

    const updatedWarehouseActivity = {
      ...warehouseActivity,
      current: warehouseActivity.current - distributionInt,
      remained: warehouseActivity.current - distributionInt,
      distributed_to: updatedDistributedTo,
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

    await ctx.deleteMessage();
    await ctx.reply("Tuxum xisobingizga muvaffaqiyatli qo’shildi va saqlandi.");

    // Find the group id by courier"s phone number
    let groupId = null;
    for (const [id, numbers] of Object.entries(groups)) {
      if (numbers.includes(phone_num)) {
        groupId = id;
        break;
      }
    }

    await botInstance.telegram.sendMessage(
      groupId,
      `✅ Tasdiqlandi\n\n${car_num} (${full_name}) mashinaga ${distribution}ta tuxum qo’shildi. Mashinada ${broken}ta singan tuxum bor va ${remained}ta tuxum ostatka.`
    );
  } catch (error) {
    logger.info(error);
    await ctx.reply("Tuxum xisobingizga qo’shishda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.courierReject = async (ctx) => {
  const [action, courierId, distribution, broken, remained] = ctx.match;

  try {
    const courierResponse = await axios.get(
      `/courier/${courierId}`,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );
    const courier = courierResponse.data;

    const { full_name, car_num, phone_num } = courier;

    // Find the group id by courier"s phone number
    let groupId = null;
    for (const [id, numbers] of Object.entries(groups)) {
      if (numbers.includes(phone_num)) {
        groupId = id;
        break;
      }
    }

    await botInstance.telegram.sendMessage(
      groupId,
      `❌ Rad etildi\n\n${car_num} (${full_name}) mashinaga ${distribution}ta tuxum qo’shildi. Mashinada ${broken}ta singan tuxum bor va ${remained}ta tuxum ostatka.`
    );
    await ctx.deleteMessage();
    await ctx.reply("Tuxum xisobga qo’shilishi rad etildi.");
  } catch (error) {
    logger.info(error);
    await ctx.reply("Tuxum qo’shishni rad etishda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.setBotInstance = setBotInstance;
