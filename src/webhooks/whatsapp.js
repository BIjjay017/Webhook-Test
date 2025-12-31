const { handleIncomingMessage } = require('../orchestrator');

function extractMessageText(message = {}) {
  if (message.text?.body) return message.text.body;
  if (message.interactive?.button_reply)
    return message.interactive.button_reply.title;
  if (message.interactive?.list_reply)
    return message.interactive.list_reply.title;
  if (message.reaction?.emoji)
    return `Reaction: ${message.reaction.emoji}`;
  return null;
}

module.exports = async function whatsappWebhook(req, res) {
  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];

  if (!message) return res.sendStatus(200);

  const normalized = {
    platform: 'whatsapp',
    userId: message.from,
    messageId: message.id,
    text: extractMessageText(message),
    timestamp: Date.now()
  };

  console.log('[Normalized WhatsApp]', normalized);

  await handleIncomingMessage(normalized);
  res.sendStatus(200);
};
