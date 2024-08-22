const axios = require("../../axios");
const { Markup } = require("telegraf");
const fs = require('fs');
const path = require('path');

const { logger, readLog } = require("../../utils/logging");
const eggsDelivered = require("./eggsDelivered");
const cancel = require("../general/cancel");

// Function to read the debt limit
const getDebtLimit = () => {
  try {
    const debtLimitPath = path.join(__dirname, '../../debt_limit.js');
    const data = fs.readFileSync(debtLimitPath, 'utf8');
    const match = data.match(/module\.exports\s*=\s*(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    logger.info('Failed to extract debt limit from file');
    return null;
  } catch (error) {
    logger.info('Error reading debt limit file:', error);
    return null;
  }
};

const getPrices = () => {
  try {
    const pricesPath = path.join(__dirname, '../data/prices.js');
    const data = fs.readFileSync(pricesPath, 'utf8');
    
    // Use regex to extract the object from the file content
    const match = data.match(/module\.exports\s*=\s*({[\s\S]*});/);
    if (match && match[1]) {
      // Use eval to parse the object (be cautious with this approach)
      const prices = eval('(' + match[1] + ')');
      
      if (typeof prices === 'object' && Object.keys(prices).length > 0) {
        return prices;
      }
    }
    
    logger.info('Failed to extract valid prices from file');
    return null;
  } catch (error) {
    logger.info('Error reading prices file:', error);
    return null;
  }
};

module.exports = async (ctx) => {
  try {
    const buyerId = ctx.match[1];
    ctx.session.selectedBuyerId = buyerId;
    const response = await axios.get(`/buyer/${buyerId}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const buyer = response.data;

    const buyerActivityResponse = await axios.get(`/buyer/activity/today/${buyerId}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });

    const buyerActivity = buyerActivityResponse.data;
    const buyerDebt = buyerActivity.debt;

    const prices = getPrices();

    ctx.session.buyer = {
      ...buyer,
      addedAt: new Date(),
      eggsDelivered: 0,
      paymentAmount: 0,
      egg_price: buyerActivity.price || prices,
      debt: buyerDebt
    };

    const debtLimit = getDebtLimit();
    if (debtLimit === null) {
      cancel(ctx, "Qarzdorlik chegarasini o'qishda xatolik yuz berdi", true);
      return;
    }
    
    if (buyerDebt > (buyer.debt_limit || debtLimit)) {
      cancel(ctx, "Ushbu mijozning qarzi ruxsat berilgan chegaradan oshgan", true);
      return;
    }

    ctx.reply("Yetkazilgan tuxumlar sonini kiriting:",
      Markup.keyboard([
        ["Bekor qilish ❌"]
    ]));
    eggsDelivered.deliverEggs(ctx);

  } catch (error) {
    logger.info(error);
    await ctx.reply("Klient tanlashda xatolik yuz berdi. Qayta urunib ko'ring");
  }
};