async function sendReply(platform, userId, text) {
  if (platform === "whatsapp") {
    console.log(`[Reply → WhatsApp] ${userId}: ${text}`);
    // call WhatsApp Send Message API
  }

  if (platform === "messenger") {
    console.log(`[Reply → Messenger] ${userId}: ${text}`);
    // call Messenger Send API
  }
}

module.exports = { sendReply };
