const { handleIncomingMessage } = require('../orchestrator');

function parseMessengerPayload(payload) {
  const event = payload.entry?.[0]?.messaging?.[0];
  if (!event?.message?.text) return null;

  return {
    platform: "messenger",
    userId: event.sender.id,
    messageId: event.message.mid,
    text: event.message.text,
    timestamp: Date.now()
  };
}

async function messengerWebhook(req, res) {
  const normalized = parseMessengerPayload(req.body);
  if (!normalized) return res.sendStatus(200);

  await handleIncomingMessage(normalized);
  res.sendStatus(200);
}

module.exports = messengerWebhook;
