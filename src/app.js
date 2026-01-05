import express from 'express';
import whatsappWebhook from './webhooks/whatsapp.js';
import messengerWebhook from './webhooks/messenger.js';
import { detectIntentAndRespond } from './ai/intentEngine.js';
import { sendWhatsAppMessage } from './whatsapp/sendmessage.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

/* ======================
   WEBHOOK VERIFICATION
====================== */
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

/* ======================
   WEBHOOK RECEIVER
====================== */
app.post('/webhook', async (req, res) => {
  const object = req.body.object;

  if (object === 'whatsapp_business_account') {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    if (Array.isArray(messages)) {
      for (const message of messages) {
        const text = message.text?.body;
        if (!text) continue;

        const userId = message.from;
        const userName = value?.contacts?.[0]?.profile?.name || 'Unknown';
        const messageType = message.type || 'text';
        const messageId = message.id;

        console.log(`\n━━━ INCOMING MESSAGE ━━━`);
        console.log(`📱 From: ${userName} (${userId})`);
        console.log(`📝 Type: ${messageType}`);
        console.log(`💬 Message: ${text}`);

        const aiResult = await detectIntentAndRespond(text);

        console.log(`━━━ AI RESPONSE ━━━`);
        console.log(`🎯 Intent: ${aiResult.intent}`);
        console.log(`💡 Response: ${aiResult.response}`);

        // 🔥 Send reply back to WhatsApp
        await sendWhatsAppMessage(userId, aiResult.response);
        console.log(`✅ Reply sent to ${userId}\n`);
      }
    }

    return res.sendStatus(200);
  }

  if (object === 'page') {
    return messengerWebhook(req, res);
  }

  res.sendStatus(200);
});

/* ======================
   SERVER START
====================== */
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});