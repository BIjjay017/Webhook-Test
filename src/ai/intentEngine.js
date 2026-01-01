import { groq } from './groqClient.js';

/**
 * Takes user message text and returns:
 * {
 *   intent: string,
 *   response: string
 * }
 */
export async function detectIntentAndRespond(userMessage) {
  const systemPrompt = `
You are an AI assistant for a restaurant chatbot.

Your responsibilities:
1. Understand the user's message
2. Identify the user's intent
3. Generate a short, friendly, professional response

You MUST follow these rules:
- Be concise and polite
- Never mention internal systems or APIs
- If unsure, ask a clarifying question
- Do NOT hallucinate menu items or bookings

Supported intents:
- greet (hello, hi, hey)
- show_menu (menu, food, drinks)
- book_table (book, reserve, table)
- ask_hours (open, close, timing)
- goodbye (bye, thanks)
- unknown

Respond ONLY in valid JSON using this format:

{
  "intent": "<intent_name>",
  "response": "<message to send to the customer>"
}
`;

  const userPrompt = `
User message: "${userMessage}"

Return JSON like:
{
  "intent": "...",
  "response": "..."
}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  const raw = completion.choices[0].message.content;

  try {
    return JSON.parse(raw);
  } catch (err) {
    return {
      intent: "unknown",
      response: "Sorry, I didn’t understand that. Could you rephrase?"
    };
  }
}
