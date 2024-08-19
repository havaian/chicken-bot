const { logger, readLog } = require("../../utils/logging");

module.exports = (eggs) => {
  try {
    const nonZeroCategories = {};
  
    for (const [key, value] of Object.entries(eggs)) {
      if (value > 0) {
        nonZeroCategories[key] = value;
      }
    }
  
    return nonZeroCategories;
  } catch (error) {
    logger.info(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
}