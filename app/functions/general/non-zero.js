const { logger, readLog } = require("../../utils/logging");

module.exports = (items) => {
  try {
    const nonZeroCategories = {};
  
    for (const [key, value] of Object.entries(items)) {
      if (value > 0) {
        nonZeroCategories[key] = value;
      }
    }
  
    return nonZeroCategories;
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
}