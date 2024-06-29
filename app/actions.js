const axios = require("./axios");

exports.middleware = async (ctx, next) => {
  // Initialize user session and user data field
  ctx.session = ctx.session || {};
  ctx.session.user = ctx.session.user || null;

  // If user data is not present in session, show a button for user to send contact
  if (!ctx.session.user) {
    try {
      // Example: Send a button for the user to send their contact
      await ctx.reply("Please click the button below to send your contact.", {
        reply_markup: {
          keyboard: [[{ text: "Send Contact", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });

      // Returning here to avoid continuing to next middleware until user sends contact
      return;
    } catch (error) {
      console.error("Error sending contact button:", error);
      // Handle error or inform user about the issue
      await ctx.reply("Failed to send contact button. Please try again later.");
      return;
    }
  }

  // If user data is already present, continue to next middleware
  next();
};
