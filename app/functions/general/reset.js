const resetState = (ctx) => {
  // Preserve only the user information and reset the rest of the session
  const { user } = ctx.session;
  ctx.session = { user };
};

module.exports = resetState;