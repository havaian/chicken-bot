const axios = require("../../axios");
const { Markup } = require("telegraf");
const groups = require("../data/groups");

const report = require("./report");

const cancel = require("../general/cancel");

const { logger, readLog } = require("../../utils/logging");

const { categoriesByTextObject } = require("../general/categories");

const item_prices = require("../data/prices");
const letters = require("../data/btnEmojis");

const items = { 
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

    const response = await axios.get("/courier/activity/today/accepted-unfinished", {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const courierActivities = response.data;

    if (courierActivities.length === 0) {
      await ctx.reply("Kuryerlar topilmadi.");
      return;
    }

    let message = "Kuryerni tanlang:\n";
    const buttons = courierActivities.map((activity, index) => {
      message += `${index + 1}. ${activity.courier.car_num ? activity.courier.car_num + ", " : ""} ${activity.courier.full_name ? activity.courier.full_name : ""}\n`;
      return Markup.button.callback(
        `${index + 1}`,
        `select-courier-accepted:${activity.courier._id}`
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
    await ctx.reply("Qayta yuklash uchun mashinalar topilmadi.");
  }
};

module.exports.promptDistribution = async (ctx) => {
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
    }

    const type = ((ctx?.match && ctx?.match[0] === "accept-distribution-accepted-no") || typeof ctx.session["distributedItemsData"] === "undefined") ? 2 : 1;

    const deleteMsg = ctx?.match && ctx?.match[0] === "accept-distribution-accepted-no";

    if (deleteMsg) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    }

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("Ha ✅", "accept-distribution-accepted-yes"),
        Markup.button.callback("Yo’q ❌", "accept-distribution-accepted-no")
      ]
    ]);

    const { full_name, car_num } = ctx.session.selectedCourier;

    if (type === 2) {
      await ctx.reply(`${full_name} ${car_num ? "(" + car_num + ")" : ""} mashinaga qayta yuklangan maxsulotlar sonini kiriting`,
        Markup.keyboard([
          ["Bekor qilish ❌"]
        ]));
    }

    // categoriesByButtonsObject(ctx, "awaitingItemsDistributedAcceptedItems", actionKey1, actionKey2, "yuklangan", "yuklanganini", keyboard, type, "distributedItemsData")
    categoriesByTextObject(ctx, "awaitingItemsDistributedAcceptedItems", "yuklangan", keyboard, type, "distributedItemsData", item_prices, false, true);
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

    for (let y in Object.keys(ctx.session.distributedItemsData)) {
      const x = Object.keys(ctx.session.distributedItemsData)[y];
      let z = x;
      if (x === "UP") {
        z = "D1";
      };
      if (typeof current[z] === "undefined") {
        current[z] = 0;
      }
      if (current[z] - ctx.session.distributedItemsData[x] < 0) {
        await ctx.reply("Kuryerga yuklangan maxsulot soni omborda bor maxsulot sonidan katta");
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

    const distributedItemsData = ctx.session.distributedItemsData;

    // Save the data to Redis as one object
    const itemsData = {
      distributedItemsData,
      loadingTime: new Date().toISOString()
    };
    await redis.set(`itemsData:${_id}`, JSON.stringify(itemsData));

    ctx.session.distributedItemsData = undefined;
    ctx.session.categories = null;
    ctx.session.currentCategoryIndex = null;

    const formatItemData = (data) => {
        return Object.entries(data)
            .map(([category, amount]) => `${letters[category]}: ${amount}ta`) 
            .join(',\n');
    };

    const distributedItemsMessage = formatItemData(distributedItemsData);

    // Update warehouse activity and send confirmation message
    const courierResponse = await axios.get(`/courier/${_id}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const courier = courierResponse.data;
    
    const finalMessageGroup = `⚠️ Tasdiqlashni kutilmoqda\n\n${full_name} ${car_num ? "(" + car_num + ")" : ""}:\n\nQayta yuklangan:\n${distributedItemsMessage}`;
    const finalMessageCourier = `⚠️ Sizning xisobingizga maxsulot qo’shildi.\n\n${full_name} ${car_num ? "(" + car_num + ")" : ""}:\n\nQayta yuklangan:\n${distributedItemsMessage}`;

    // Send message to courier
    const messageToCourier = await botInstance.telegram.sendMessage(
      courier.telegram_chat_id,
      finalMessageCourier
    );

    const approvalMessageToCourier = await botInstance.telegram.sendMessage(
      courier.telegram_chat_id,
      `Tasdiqlang.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Tasdiqlash ✅", `courier-accepted-accept:${_id}`)],
        [Markup.button.callback("Rad etish ❌", `courier-accepted-reject:${_id}`)],
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

    // Retrieve item data from Redis
    const itemsData = JSON.parse(await redis.get(`itemsData:${courierId}`));
    const { distributedItemsData = {}, loadingTime = "" } = itemsData;

    // Create new accepted entry
    const newAcceptedEntry = {
      items: distributedItemsData,
      loadingTime: loadingTime, // Time when items were loaded
      acceptTime: new Date().toISOString()   // Time when courier accepted
    };

    // Update current items
    const updatedCurrent = await updateCategory(courierActivity.current || {}, distributedItemsData, 'add', false);

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
      items: distributedItemsData,
      time: new Date().toLocaleString(),
    });

    // Usage for warehouse
    const updatedWarehouseActivity = {
      ...warehouseActivity,
      current: await updateCategory(warehouseActivity.current, distributedItemsData, 'subtract', true), // is warehouse? true
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

    const formatItemData = (data) => {
    return Object.entries(data)
        .map(([category, amount]) => `${letters[category]}: ${amount}ta`) 
        .join(',\n');
    };

    const distributedItemsMessage = formatItemData(distributedItemsData);

    await ctx.reply(`✅ Maxsulotlar xisobingizga muvaffaqiyatli qo'shildi va saqlandi.\n\nQayta yuklangan:\n${distributedItemsMessage}`);

    // Find the group id by courier's phone number
    let groupId = groups;

    const finalMessageGroup = `✅ Tasdiqlandi\n\n${full_name} ${car_num ? "(" + car_num + ")" : ""}:\n\nQayta yuklangan:\n${distributedItemsMessage}`;

    await botInstance.telegram.sendMessage(
      groupId,
      finalMessageGroup
    );
  } catch (error) {
    logger.error(error);
    await ctx.reply("Maxsulotlar xisobingizga qo'shishda xatolik yuz berdi. Qayta urunib ko'ring");
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

    // Retrieve item data from Redis
    const itemsData = JSON.parse(await redis.get(`itemsData:${courierId}`));
    const { distributedItemsData = {} } = itemsData;

    const formatItemData = (data) => {
    return Object.entries(data)
        .map(([category, amount]) => `${letters[category]}: ${amount}ta`) 
        .join(',\n');
    };

    const distributedItemsMessage = formatItemData(distributedItemsData);

    const finalMessageGroup = `❌ Rad etildi\n\n${full_name} ${car_num ? "(" + car_num + ")" : ""}:\n\nQayta yuklangan:\n${distributedItemsMessage}`;

    // Find the group id by courier's phone number
    let groupId = groups;

    // Delete Redis key
    await redis.del(`itemsData:${courierId}`);

    await botInstance.telegram.sendMessage(
      groupId,
      finalMessageGroup
    );
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });(ctx.callbackQuery.message.message_id);
    await ctx.reply(`❌ Maxsulotlar xisobga qo’shilishi rad etildi.\n\nQayta yuklangan:\n${distributedItemsMessage}`);
  } catch (error) {
    logger.error(error);
    await ctx.reply("Maxsulotlar qo’shishni rad etishda xatolik yuz berdi. Qayta urunib ko’ring");
  }
};

module.exports.setBotInstance = setBotInstance;
