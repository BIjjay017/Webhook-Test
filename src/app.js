const express = require('express');
const whatsappWebhook = require('./webhooks/whatsapp');
const messengerWebhook = require('./webhooks/messenger');

require('dotenv').config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

app.use((req, res, next) => {
  console.log(`Incoming ${req.method} ${req.url}`);
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
app.post('/webhook', (req, res) => {
  const object = req.body.object;

  if (object === 'whatsapp_business_account') {
    return whatsappWebhook(req, res);
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