const { getContext, updateContext } = require('./context');
const { routeIntent } = require('./router');
const { sendReply } = require('../services/reply');

async function handleIncomingMessage(message) {
  const context = await getContext(message.userId);

  const decision = await routeIntent({
    text: message.text,
    context
  });

  await updateContext(message.userId, decision.updatedContext);
  await sendReply(message.platform, message.userId, decision.reply);
}

module.exports = { handleIncomingMessage };
