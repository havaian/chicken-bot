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

const { logger, readLog } = require("../../utils/logs");

let botInstance = null;

const setBotInstance = (bot) => {
    botInstance = bot;
};

module.exports.promptCourier = async (ctx) => {
  try {
    ctx.session.selectedCourier = {};

    const response = await axios.get("/courier/all", {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const couriers = response.data;

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

    console.log(ctx.session.selectedCourier);
    await ctx.reply(`${ctx.session.selectedCourier.car_num} (${ctx.session.selectedCourier.full_name}) mashinadagi singan tuxumlarni kiriting.`);

    await ctx.deleteMessage();
  } catch (error) {
    await ctx.deleteMessage();
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
        ],
        [Markup.button.callback("Bekor qilish", "cancel")],
      ]));
  } catch (error) {
    logger.info(error);
    await ctx.reply("Kiritilgan singan tuxumlarni tasdiqlashda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.confirmCourierBroken = async (ctx) => {
  try {
    const { _id, broken = 0, full_name, car_num } = ctx.session.selectedCourier;

    const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const warehouseActivity = warehouseActivityResponse.data;

    // Find and update the element in the distributed_to array
    let updated = false;
    const updatedDistributedTo = warehouseActivity.distributed_to.map((dist) => {
      if (dist._id === _id) {
        updated = true;
        return { ...dist, broken: broken };
      }
      return dist;
    });

    // If no existing entry was updated, create a new one
    if (!updated) {
      updatedDistributedTo.push({
        _id: _id,
        courier_name: full_name,
        broken: broken,
        time: new Date().toLocaleString(),
      });
    }

    const updatedWarehouseActivity = {
      ...warehouseActivity,
      distributed_to: updatedDistributedTo,
    };

    await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });

    this.promptCourierRemained(ctx);
  } catch (error) {
    await ctx.deleteMessage();
    logger.info(error);
    await ctx.reply("Singan tuxumlarni saqlashda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.promptCourierRemained = async (ctx) => {
  try {
    const { full_name, car_num } = ctx.session.selectedCourier;
    ctx.session.awaitingCourierBrokenEggs = false;
    ctx.session.awaitingCourierRemainedEggs = true;
    await ctx.reply(`${car_num} (${full_name}) mashinadagi ostatkani kiriting.`);
    await ctx.deleteMessage();
  } catch (error) {
    logger.info(error);
    await ctx.reply("Mashinada qolgan tuxumda xatolik yuz berdi. Qayta urunib ko’ring");
  }
}

module.exports.acceptCourierRemained = async (ctx) => {
  try {
    const { full_name, car_num } = ctx.session.selectedCourier;

    
    const amount = ctx.text;
    const amountInt = parseInt(amount, 10);
    ctx.session.selectedCourier.remained = amountInt;

    await ctx.reply(`${car_num} (${full_name}) mashinaga ${amountInt}ta ostatka tuxum qo’shildi.`)

    await ctx.reply("Tasdiqlaysizmi",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Ha", "courier-remained-yes"),
          Markup.button.callback("Yo’q", "courier-remained-no"),
        ],
        [Markup.button.callback("Bekor qilish", "cancel")],
      ]));
  } catch (error) {
    logger.info(error);
    await ctx.reply("Mashinada ostatka tuxumni kiritishda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.confirmCourierRemained = async (ctx) => {
  try {
    const { _id, car_num, full_name, remained = 0 } = ctx.session.selectedCourier;

    const warehouseActivityResponse = await axios.get(
      "/warehouse/activity/today",
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );
    const warehouseActivity = warehouseActivityResponse.data;

    // Find and update the element in distributed_to array
    const updatedDistributedTo = warehouseActivity.distributed_to.map(
      (dist) => {
        if (dist._id === _id) {
          return { ...dist, remained: remained };
        }
        return dist;
      }
    );

    const updatedWarehouseActivity = {
      ...warehouseActivity,
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
    await ctx.reply(`${car_num} (${full_name}) mashinaga yuklangan tuxumlar sonini kiriting.`);
    await ctx.deleteMessage();
  } catch (error) {
    await ctx.reply("Mashinaga tuxum yuklashda xatolik yuz berdi. Qayta urunib ko’ring");
  }
}

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
          Markup.button.callback("Ha",`accept-distribution-yes`),
          Markup.button.callback("Yo’q",`accept-distribution-no`)
        ],
        [Markup.button.callback("Bekor qilish", "cancel")],
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
  const { _id, full_name, car_num, distribution = 0 } = ctx.session.selectedCourier;

  try {
    await ctx.deleteMessage();

    const warehouseActivityResponse = await axios.get(
      "/warehouse/activity/today",
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );
    const warehouseActivity = warehouseActivityResponse.data;

    if (warehouseActivity.current <= 0) {
      ctx.reply("Omborda tuxum qolmagan");
      return;
    }

    if (warehouseActivity.current - distribution <= 0) {
      ctx.reply("Omborda tuxum yetmaydi");
      return;
    }

    const courierResponse = await axios.get(`/courier/${_id}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const courier = courierResponse.data;

    await botInstance.telegram.sendMessage(
      courier.telegram_chat_id,
      `Sizning xisobingizga ${distribution} tuxum qo’shildi. Iltimos, tasdiqlang.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Tasdiqlash",`courier-accept:${_id}:${distribution}`),],
        [Markup.button.callback("Rad etish", "courier-reject")],
      ])
    );

    await ctx.reply(`Xabar ${car_num} (${full_name}) mashinaga yetkazildi!`);

    this.promptCircleVideo(ctx);
  } catch (error) {
    logger.info(error);
    await ctx.reply("Mashinaga xabar yetkazishda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.promptCircleVideo = async (ctx) => {
  try {
    await ctx.reply("Iltimos, hisobot uchun dumaloq video yuboring.");
    ctx.session.awaitingCircleVideoWarehouse = true;
  } catch (error) {
    logger.info(error);
    await ctx.reply("Dumoloq videoda xatolik yuz berdi. Qayta urunib ko’ring");
  }
}

module.exports.handleCircleVideo = async (ctx) => {
  try {
    if (!ctx.message.video_note || ctx.message.forward_from) {
      await ctx.reply("Iltimos, hisobot uchun dumaloq video yuboring.");
      return;
    }
  
    if (ctx.message.video_note.duration < 5) {
      await ctx.reply("Hisobot uchun dumaloq video uzunligi 4 soniyadan kam bo‘lmasligi kerak.");
      return;
    }
  
    const warehousePhoneNum = ctx.session.user.phone_num;
  
    // Find the group id by courier"s phone number
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
            
    // Forward the video to the group using message ID
    const messageId = ctx.message.message_id;
    await ctx.telegram.forwardMessage(groupId, ctx.chat.id, messageId);

    // Clear session video flag
    ctx.session.awaitingCircleVideoWarehouse = false;
  } catch (error) {
    logger.info(error);
    ctx.reply("Dumaloq video yuborishda xatolik yuz berdi. Qayta urunib ko‘ring.")
  }
}

module.exports.courierAccept = async (ctx) => {
  const [action, courierId, amount] = ctx.match;
  const amountInt = parseInt(amount, 10);

  try {
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
      current: courierActivity.current + amountInt,
      accepted: courierActivity.accepted + amountInt,
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

    // Find and update the element in distributed_to array
    const updatedDistributedTo = warehouseActivity.distributed_to.map(
      (dist) => {
        if (dist._id === courierId) {
          return { ...dist, eggs: amountInt };
        }
        return dist;
      }
    );

    const updatedWarehouseActivity = {
      ...warehouseActivity,
      current: warehouseActivity.current - amountInt,
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
  } catch (error) {
    logger.info(error);
    await ctx.reply("Tuxum xisobingizga qo’shishda xatolik yuz berdi. Qayta urunib ko’ring" );
  }
};

module.exports.courierReject = async (ctx) => {
  try {
    await ctx.deleteMessage();
    await ctx.reply("Tuxum xisobga qo’shilishi rad etildi.");
  } catch (error) {
    logger.info(error);
    await ctx.reply("Tuxum qo’shishni rad etishda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.setBotInstance = setBotInstance;