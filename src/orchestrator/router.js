async function routeIntent({ text, context }) {

  if (/menu/i.test(text)) {
    return {
      reply: "Here is our menu...",
      updatedContext: context
    };
  }

  if (/book/i.test(text)) {
    return {
      reply: "Which table would you like to book?",
      updatedContext: { ...context, intent: "BOOK_TABLE" }
    };
  }

  return {
    reply: "Sorry, I didn't understand that. Can you rephrase?",
    updatedContext: context
  };
}

module.exports = { routeIntent };
