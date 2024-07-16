const resetState = (ctx) => {
  // Reset session, preserving only the user information
  ctx.session = { user: ctx.session.user };
};

module.exports = resetState;
