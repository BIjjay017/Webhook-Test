// Import Express.js
const express = require('express');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and verify_token
const port = process.env.PORT;
const verifyToken = process.env.VERIFY_TOKEN;

// Route for GET requests
app.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for POST requests
app.post('/webhook', (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);

  const extractMessageText = (message = {}) => {
    if (message.text && message.text.body) return message.text.body;
    if (message.interactive && message.interactive.button_reply) return message.interactive.button_reply.title;
    if (message.interactive && message.interactive.list_reply) return message.interactive.list_reply.title;
    if (message.reaction && message.reaction.emoji) return `Reaction: ${message.reaction.emoji}`;
    return '[Non-text or unsupported message type]';
  };

  const entries = Array.isArray(req.body.entry) ? req.body.entry : [];

  entries.forEach((entry) => {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];

    changes.forEach((change) => {
      const value = change.value || {};
      const metadata = value.metadata || {};
      const businessId = metadata.phone_number_id;
      const businessNumber = metadata.display_phone_number;

      if (Array.isArray(value.messages)) {
        value.messages.forEach((message) => {
          const senderIsBusiness = businessId && message.from === businessId;
          const senderLabel = senderIsBusiness ? 'Business' : 'User';
          const recipient = message.to || businessNumber || 'Unknown recipient';
          const text = extractMessageText(message);
          console.log(`[${senderLabel}] ${message.from} -> ${recipient}: ${text}`);
        });
      }

      if (Array.isArray(value.statuses)) {
        value.statuses.forEach((status) => {
          console.log(`[Business] Status update for ${status.recipient_id || 'unknown'}: ${status.status} (id: ${status.id || 'n/a'})`);
        });
      }
    });
  });

  console.log(JSON.stringify(req.body, null, 2));
  res.status(200).end();
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});