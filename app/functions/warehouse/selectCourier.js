const axios = require("../../axios");
const { Markup } = require("telegraf");
const groups = require("../data/groups");

const report = require("./report");

const cancel = require("../general/cancel");

const { logger, readLog } = require("../../utils/logging");

const { categoriesByTextObject } = require("../general/categories");

const egg_prices = require("../data/prices");
const letters = require("../data/btnEmojis");

const eggs = { 
  "D1": 960,
  "D2": 990
};

let botInstance = null;

const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL);

redis.on('connect', () => {
  logger.info('Redis ✅');
});

redis.on('error', (err) => {
  logger.info('❌ Redis:', err);
});

const setBotInstance = (bot) => {
  botInstance = bot;
};

module.exports.promptCourier = async (ctx) => {
  try {
    ctx.session.selectedCourier = {};

    const response = await axios.get("/courier/activity/today/unaccepted", {
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
      message += `${index + 1}. ${courier.car_num ? courier.car_num + ", " : ""} ${courier.full_name ? courier.full_name : ""}\n`;
      return Markup.button.callback(
        `${index + 1}`,
        `select-courier:${courier._id}`
      );
    });

    const buttonRows = [];
    for (let i = 0; i < buttons.length; i += 3) {
      buttonRows.push(buttons.slice(i, i + 3));
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
    await ctx.reply("Mashinalar topilmadi. Qayta urunib ko’ring");
  }
};

module.exports.promptCourierBroken = async (ctx) => {
  try {
    const warehouseResponse = await axios.get(`/warehouse/activity/today`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const warehouse = warehouseResponse.data;

    ctx.session.currentEggs = warehouse.current;

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
    }

    // this.promptCourierRemained(ctx);

    const deleteMsg = ctx?.match && (ctx?.match[0] === "courier-broken-no" || ctx?.match[0].split(":")[0] === "select-courier");

    if (deleteMsg) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    }
    
    const courierResponse = await axios.get(`/courier/${ctx.session.selectedCourier._id}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const courier = courierResponse.data;

    if (!courier.telegram_chat_id || typeof courier.telegram_chat_id === "undefined") {
      await ctx.reply("Bu kuryer uchun telegram id topilmadi! Kuryer birinchi botga kirib /start qilib kontakt yuborishi zarur");
      ctx.session.selectedCourier = {};
      return;
    }

    const type = ((ctx?.match && ctx?.match[0] === "courier-broken-no") || typeof ctx.session["brokenEggsData"] === "undefined") ? 2 : 1;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("Ha ✅", "courier-broken-yes"),
        Markup.button.callback("Yo’q ❌", "courier-broken-no"),
      ]
    ]);

    if (type === 2) {
      await ctx.reply(`${ctx.session.selectedCourier.full_name} ${ctx.session.selectedCourier.car_num ? "(" + ctx.session.selectedCourier.car_num + ")" : ""} mashinadagi nasechka tuxumlarni kiriting`,
        Markup.keyboard([
          ["Bekor qilish ❌"]
        ]));
    }

    categoriesByTextObject(ctx, "awaitingCourierBrokenEggs", "nasechka", keyboard, type, "brokenEggsData");
  } catch (error) {
    logger.error(error);
    await ctx.reply("Nasechka tuxumlarni kiritishda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.confirmCourierBroken = async (ctx) => {
  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    this.promptCourierRemained(ctx);
  } catch (error) {
    logger.error(error);
    await ctx.reply("Singan tuxumlarni saqlashda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.promptCourierRemained = async (ctx) => {
  try {
    const type = ((ctx?.match && ctx?.match[0] === "courier-remained-no") || typeof ctx.session["remainedEggsData"] === "undefined") ? 2 : 1;

    const deleteMsg = ctx?.match && ctx?.match[0] === "courier-remained-no";

    if (deleteMsg) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    }

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("Ha ✅", "courier-remained-yes"),
        Markup.button.callback("Yo’q ❌", "courier-remained-no"),
      ]
    ]);

    const { full_name, car_num } = ctx.session.selectedCourier;

    if (type === 2) {
      await ctx.reply(`${full_name} ${car_num ? "(" + car_num + ")" : ""} mashinadagi ostatkani kiriting`,
        Markup.keyboard([
          ["Bekor qilish ❌"]
        ]));
    }

    categoriesByTextObject(ctx, "awaitingCourierRemainedEggs", "ostatka", keyboard, type, "remainedEggsData");
  } catch (error) {
    logger.error(error);
    await ctx.reply("Mashinada qolgan tuxumda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.confirmCourierRemained = async (ctx) => {
  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    this.promptCourierMelange(ctx);
  } catch (error) {
    logger.error(error);
    await ctx.reply("Mashinada ostatka tuxumni saqlashda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.promptCourierMelange = async (ctx) => {
  try {
    const type = ((ctx?.match && ctx?.match[0] === "courier-melange-no") || typeof ctx.session["melangeEggsData"] === "undefined") ? 2 : 1;

    const deleteMsg = ctx?.match && ctx?.match[0] === "courier-melange-no";

    if (deleteMsg) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    }

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("Ha ✅", "courier-melange-yes"),
        Markup.button.callback("Yo’q ❌", "courier-melange-no"),
      ]
    ]);

    const { full_name, car_num } = ctx.session.selectedCourier;

    if (type === 2) {
      await ctx.reply(`${full_name} ${car_num ? "(" + car_num + ")" : ""} mashinadagi melanjni kiriting`,
        Markup.keyboard([
          ["Bekor qilish ❌"]
        ]));
    }

    categoriesByTextObject(ctx, "awaitingCourierMelangeEggs", "melanj", keyboard, type, "melangeEggsData", egg_prices, true);
  } catch (error) {
    logger.error(error);
    await ctx.reply("Kuryer melanj kiritishda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.confirmCourierMelange = async (ctx) => {
  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    this.promptDistribution(ctx);
  } catch (error) {
    logger.error(error);
    await ctx.reply("Kuryer melanj saqlashda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.promptDistribution = async (ctx) => {
  try {
    const type = ((ctx?.match && ctx?.match[0] === "accept-distribution-no") || typeof ctx.session["distributedEggsData"] === "undefined") ? 2 : 1;

    const deleteMsg = ctx?.match && ctx?.match[0] === "accept-distribution-no";

    if (deleteMsg) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    }

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("Ha ✅", "accept-distribution-yes"),
        Markup.button.callback("Yo’q ❌", "accept-distribution-no")
      ]
    ]);

    const { full_name, car_num } = ctx.session.selectedCourier;

    if (type === 2) {
      await ctx.reply(`${full_name} ${car_num ? "(" + car_num + ")" : ""} mashinaga yuklangan tuxumlar sonini kiriting`,
        Markup.keyboard([
          ["Bekor qilish ❌"]
        ]));
    }

    // categoriesByButtonsObject(ctx, "awaitingEggsDistributedEggs", actionKey1, actionKey2, "yuklangan", "yuklanganini", keyboard, type, "distributedEggsData")
    categoriesByTextObject(ctx, "awaitingEggsDistributedEggs", "yuklangan", keyboard, type, "distributedEggsData", egg_prices, false, true);
  } catch (error) {
    logger.error(error);
  }
};

module.exports.confirmDistribution = async (ctx) => {
  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    this.promptCircleVideo(ctx);
  } catch (error) {
    logger.error(error);
    await ctx.reply("Mashinaga xabar yetkazishda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.promptCircleVideo = async (ctx) => {
  try {
    handleCircleVideo(ctx);
  //   await ctx.reply("Iltimos, hisobot uchun dumaloq video yuboring.",
  //     Markup.keyboard([
  //         ["Bekor qilish ❌"]
  //     ]));
  //   ctx.session.awaitingCircleVideoWarehouse = true;
  } catch (error) {
    logger.error(error);
    await ctx.reply("Dumoloq videoda xatolik yuz berdi. Qayta urunib ko’ring",
      Markup.keyboard([
          ["Bekor qilish ❌"]
      ]));
  }
};

const handleCircleVideo = async (ctx) => {
  try {
    // Example validation check for video (uncomment if needed)
    // if (!ctx.message.video_note || ctx.message.forward_from) {
    //   await ctx.reply("Iltimos, hisobot uchun dumaloq video yuboring.",
    //     Markup.keyboard([
    //         ["Bekor qilish ❌"]
    //     ]));
    //   return;
    // }

    // if (ctx.message.video_note.duration < 5) {
    //   await ctx.reply("Hisobot uchun dumaloq video uzunligi 4 soniyadan kam bo‘lmasligi kerak.");
    //   return;
    // }

    const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const warehouseActivity = warehouseActivityResponse.data;

    const current = warehouseActivity.current || {};

    for (let y in Object.keys(ctx.session.distributedEggsData)) {
      const x = Object.keys(ctx.session.distributedEggsData)[y];
      let z = x;
      if (x === "UP") {
        z = "D1";
      };
      if (typeof current[z] === "undefined") {
        current[z] = 0;
      }
      if (current[z] - ctx.session.distributedEggsData[x] < 0) {
        await ctx.reply("Kuryerga yuklangan tuxum soni omborda bor tuxum sonidan katta");
        return;
      }
    }

    const warehousePhoneNum = ctx.session.user.phone_num;

    // Find the group id by courier's phone number
    let groupId = groups;

    if (!groupId) {
      logger.info("selectCourier. Warehouse groupId not found:", groupId, !groupId);
      await ctx.reply("Guruh topilmadi. Qayta urunib ko‘ring.");
    }

    // Retrieve selected courier information from session
    const { _id, full_name, car_num } = ctx.session.selectedCourier;

    const brokenEggsData = ctx.session.brokenEggsData;
    const remainedEggsData = ctx.session.remainedEggsData;
    const distributedEggsData = ctx.session.distributedEggsData;
    const melangeEggsData = ctx.session.melangeEggsData;

    // Save the data to Redis as one object
    const eggsData = {
      brokenEggsData,
      melangeEggsData,
      remainedEggsData,
      distributedEggsData,
      loadingTime: new Date().toISOString()
    };
    await redis.set(`eggsData:${_id}`, JSON.stringify(eggsData));

    ctx.session.brokenEggsData = undefined;
    ctx.session.remainedEggsData = undefined;
    ctx.session.distributedEggsData = undefined;
    ctx.session.melangeEggsData = undefined;
    ctx.session.categories = null;
    ctx.session.currentCategoryIndex = null;

    const formatEggData = (data, melange) => {
      if (melange) {
        return Object.entries(data)
          .map(([category, amount]) => `${letters[category]}: ${amount} litr`) 
          .join(',\n');
      } else {
        return Object.entries(data)
          .map(([category, amount]) => `${letters[category]}: ${amount}ta`) 
          .join(',\n');
      }
    };

    const brokenEggsMessage = formatEggData(brokenEggsData, false);
    const remainedEggsMessage = formatEggData(remainedEggsData, false);
    const distributedEggsMessage = formatEggData(distributedEggsData, false);
    const melangeEggsMessage = formatEggData(melangeEggsData, true);

    // Update warehouse activity and send confirmation message
    const courierResponse = await axios.get(`/courier/${_id}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const courier = courierResponse.data;
    
    const finalMessageGroup = `⚠️ Tasdiqlashni kutilmoqda\n\n${full_name} ${car_num ? "(" + car_num + ")" : ""}:\n\nNasechka:\n${brokenEggsMessage}\n\nOstatka:\n${remainedEggsMessage}\n\nMelanj:\n${melangeEggsMessage}\n\nYuklangan:\n${distributedEggsMessage}`;
    const finalMessageCourier = `⚠️ Sizning xisobingizga tuxum qo’shildi.\n\n${full_name} ${car_num ? "(" + car_num + ")" : ""}:\n\nNasechka:\n${brokenEggsMessage}\n\nOstatka:\n${remainedEggsMessage}\n\nMelanj:\n${melangeEggsMessage}\n\nYuklangan:\n${distributedEggsMessage}`;

    // Send message to courier
    const messageToCourier = await botInstance.telegram.sendMessage(
      courier.telegram_chat_id,
      finalMessageCourier
    );

    const approvalMessageToCourier = await botInstance.telegram.sendMessage(
      courier.telegram_chat_id,
      `Tasdiqlang.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Tasdiqlash ✅ ", `courier-accept:${_id}`)],
        [Markup.button.callback("Rad etish", `courier-reject:${_id}`)],
      ])
    );

    // Save message IDs to Redis
    const messageIdsKey = `messageIds:${_id}`;
    const existingMessageIds = JSON.parse(await redis.get(messageIdsKey)) || [];
    existingMessageIds.push(messageToCourier.message_id, approvalMessageToCourier.message_id);
    await redis.set(messageIdsKey, JSON.stringify(existingMessageIds));

    await botInstance.telegram.sendMessage(
      groupId,
      finalMessageGroup
    );

    await cancel(ctx, "Xabar kuryerga jo’natildi.");
  } catch (error) {
    logger.error(error);
    await ctx.reply("Kuryerga xabar jo’natishda xatolik yuz berdi .")
  }
};

module.exports.courierAccept = async (ctx) => {
  const [action, courierId] = ctx.match[0].split(":");

  try {
    const courierResponse = await axios.get(`/courier/${courierId}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const courier = courierResponse.data;

    const { full_name, car_num, phone_num } = courier;

    const courierActivityResponse = await axios.get(`/courier/activity/today/${courierId}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const courierActivity = courierActivityResponse.data;

    // Retrieve egg data from Redis
    const eggsData = JSON.parse(await redis.get(`eggsData:${courierId}`));
    const { distributedEggsData = {}, brokenEggsData = {}, remainedEggsData = {}, melangeEggsData = {}, loadingTime = "" } = eggsData;

    // Create new accepted entry
    const newAcceptedEntry = {
      eggs: distributedEggsData,
      remained: remainedEggsData,
      loadingTime: loadingTime, // Time when eggs were loaded
      acceptTime: new Date().toISOString()   // Time when courier accepted
    };

    // Calculate the new current eggs as the sum of distributedEggsData and remainedEggsData
    const updatedCurrent = {};
    for (const category in distributedEggsData) {
      updatedCurrent[category] = (distributedEggsData[category] || 0) + (remainedEggsData[category] || 0);
    }

    // Usage for courier
    const updatedCourierActivity = {
      ...courierActivity,
      accepted: [...courierActivity.accepted, newAcceptedEntry],
      current: updatedCurrent,
      accepted_today: true,
      day_finished: false
    };

    if (ctx?.session) {
      ctx.session.day_finished = false;
    }

    await axios.put(`/courier/activity/${courierActivity._id}`, updatedCourierActivity, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });

    const warehouseActivityResponse = await axios.get("/warehouse/activity/today", {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const warehouseActivity = warehouseActivityResponse.data;

    // Find and update the element in the distributed_to array
    const updatedDistributedTo = warehouseActivity.distributed_to;

    // If no existing entry was updated, create a new one
    updatedDistributedTo.push({
      _id: courierId,
      courier_name: full_name,
      eggs: distributedEggsData,
      incision: brokenEggsData,
      remained: remainedEggsData,
      melange: melangeEggsData,
      time: new Date().toLocaleString(),
    });

    // Usage for warehouse
    const updatedWarehouseActivity = {
      ...warehouseActivity,
      current: await updateCategory(warehouseActivity.current, distributedEggsData, 'subtract', true), // is warehouse? true
      distributed_to: updatedDistributedTo,
    };

    await axios.put(`/warehouse/activity/${warehouseActivity._id}`, updatedWarehouseActivity, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });

    // Retrieve and delete all message IDs
    const messageIdsKey = `messageIds:${courierId}`;
    const messageIds = JSON.parse(await redis.get(messageIdsKey)) || [];
    for (const messageId of messageIds) {
      try {
        await botInstance.telegram.deleteMessage(courier.telegram_chat_id, messageId);
      } catch (error) {
        // Handle message deletion errors if necessary
      }
    }
    await redis.del(messageIdsKey);

    const formatEggData = (data, melange) => {
      if (melange) {
        return Object.entries(data)
          .map(([category, amount]) => `${letters[category]}: ${amount} litr`) 
          .join(',\n');
      } else {
        return Object.entries(data)
          .map(([category, amount]) => `${letters[category]}: ${amount}ta`) 
          .join(',\n');
      }
    };

    const brokenEggsMessage = formatEggData(brokenEggsData, false);
    const remainedEggsMessage = formatEggData(remainedEggsData, false);
    const distributedEggsMessage = formatEggData(distributedEggsData, false);
    const melangeEggsMessage = formatEggData(melangeEggsData, true);

    await ctx.reply(`✅ Tuxumlar xisobingizga muvaffaqiyatli qo'shildi va saqlandi.\n\nNasechka:\n${brokenEggsMessage}\n\nOstatka:\n${remainedEggsMessage}\n\nMelanj:\n${melangeEggsMessage}\n\nYuklangan:\n${distributedEggsMessage}`);

    // Find the group id by courier's phone number
    let groupId = groups;

    const finalMessageGroup = `✅ Tasdiqlandi\n\n${full_name} ${car_num ? "(" + car_num + ")" : ""}:\n\nNasechka:\n${brokenEggsMessage}\n\nOstatka:\n${remainedEggsMessage}\n\nMelanj:\n${melangeEggsMessage}\n\nYuklangan:\n${distributedEggsMessage}`;

    await botInstance.telegram.sendMessage(
      groupId,
      finalMessageGroup
    );
  } catch (error) {
    logger.error(error);
    await ctx.reply("Tuxumlar xisobingizga qo'shishda xatolik yuz berdi. Qayta urunib ko'ring");
  }
};

// Helper function to update category totals
const updateCategory = async (currentData = {}, newData = {}, operation = 'add', isWarehouse = false) => {
  try {
    const result = { ...currentData };
  
    for (const [key, value] of Object.entries(newData)) {
      const actualKey = isWarehouse && key === 'UP' ? 'D1' : key;
      if (operation === 'add') {
        result[actualKey] = (result[actualKey] || 0) + value;
      } else {
        result[actualKey] = (result[actualKey] || 0) - value;
      }
    }
  
    return result;
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko'ring.");
  }
};

module.exports.courierReject = async (ctx) => {
  const [action, courierId] = ctx.match[0].split(":");

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

    // Retrieve egg data from Redis
    const eggsData = JSON.parse(await redis.get(`eggsData:${courierId}`));
    const { distributedEggsData = {}, brokenEggsData = {}, remainedEggsData = {}, melangeEggsData = {} } = eggsData;

    const formatEggData = (data, melange) => {
      if (melange) {
        return Object.entries(data)
          .map(([category, amount]) => `${letters[category]}: ${amount} litr`) 
          .join(',\n');
      } else {
        return Object.entries(data)
          .map(([category, amount]) => `${letters[category]}: ${amount}ta`) 
          .join(',\n');
      }
    };

    const brokenEggsMessage = formatEggData(brokenEggsData, false);
    const remainedEggsMessage = formatEggData(remainedEggsData, false);
    const distributedEggsMessage = formatEggData(distributedEggsData, false);
    const melangeEggsMessage = formatEggData(melangeEggsData, true);

    const finalMessageGroup = `❌ Rad etildi\n\n${full_name} ${car_num ? "(" + car_num + ")" : ""}:\n\nNasechka:\n${brokenEggsMessage}\n\nOstatka:\n${remainedEggsMessage}\n\nMelanj:\n${melangeEggsMessage}\n\nYuklangan:\n${distributedEggsMessage}`;

    // Find the group id by courier's phone number
    let groupId = groups;

    // Delete Redis key
    await redis.del(`eggsData:${courierId}`);

    await botInstance.telegram.sendMessage(
      groupId,
      finalMessageGroup
    );
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });(ctx.callbackQuery.message.message_id);
    await ctx.reply(`❌ Tuxumlar xisobga qo’shilishi rad etildi.\n\nNasechka:\n${brokenEggsMessage}\n\nOstatka:\n${remainedEggsMessage}\n\nMelanj:\n${melangeEggsMessage}\n\nYuklangan:\n${distributedEggsMessage}`);
  } catch (error) {
    logger.error(error);
    await ctx.reply("Tuxumlar qo’shishni rad etishda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.setBotInstance = setBotInstance;
