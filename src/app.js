import express from 'express';
import whatsappWebhook from './webhooks/whatsapp.js';
import messengerWebhook from './webhooks/messenger.js';
import { detectIntentAndRespond } from './ai/intentEngine.js';
import { sendWhatsAppMessage } from './whatsapp/sendmessage.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const port = process.env.PORT;
const verifyToken = process.env.VERIFY_TOKEN;

app.use((req, res, next) => {
  console.log(`Incoming ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
});


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

        console.log('User message:', text);

        const aiResult = await detectIntentAndRespond(text);

        console.log('AI Intent:', aiResult.intent);
        console.log('AI Response:', aiResult.response);

        // 🔥 Send reply back to WhatsApp
        await sendWhatsAppMessage(userId, aiResult.response);

        console.log(`[Reply → WhatsApp] ${userId}: ${aiResult.response}`);
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