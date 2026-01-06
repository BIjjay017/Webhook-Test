import { detectIntentAndRespond } from '../ai/intentEngine.js';
import {
  sendWhatsAppMessage,
  sendWhatsAppListMessage,
  sendWhatsAppCarouselMessage,
  sendOrderConfirmationMessage,
  sendRestaurantMenuListMessage,
  sendMomoCarouselMessage
} from '../whatsapp/sendmessage.js';
import { momoImages } from '../assets/momoImages.js';

// Tool execution handlers
const toolHandlers = {
  // Step 1: Show food category menu (List Message)
  show_food_menu: async (args, userId, context) => {
    const sections = [
      {
        title: 'Food Categories',
        rows: [
          {
            id: 'cat_momos',
            title: 'Momos 🥟',
            description: 'Steamed, fried, tandoori varieties'
          },
          {
            id: 'cat_noodles',
            title: 'Noodles 🍜',
            description: 'Thukpa, Chowmein, Chopsuey'
          },
          {
            id: 'cat_rice',
            title: 'Rice Dishes 🍚',
            description: 'Fried rice, Biryani'
          },
          {
            id: 'cat_beverages',
            title: 'Beverages ☕',
            description: 'Tea, Coffee, Fresh juices'
          }
        ]
      }
    ];

    await sendWhatsAppListMessage(
      userId,
      '🍽️ Momo House Menu',
      'Welcome to Momo House! What would you like to order today? Browse our delicious categories below.',
      'Tap to view options',
      'View Categories',
      sections
    );

    return {
      reply: null, // Already sent via WhatsApp
      updatedContext: { 
        ...context, 
        stage: 'viewing_menu',
        lastAction: 'show_food_menu'
      }
    };
  },

  // Step 2: Show momo varieties carousel
  show_momo_varieties: async (args, userId, context) => {
    const cards = Object.entries(momoImages).map(([key, momo], index) => ({
      card_index: index,
      header: {
        type: 'image',
        image: {
          link: momo.imageUrl
        }
      },
      body: {
        text: `${momo.name} - ${momo.price}\n${momo.description}`
      },
      action: {
        buttons: [
          {
            type: 'quick_reply',
            reply: {
              id: `add_${key}`,
              title: 'Add to Order'
            }
          }
        ]
      }
    }));

    await sendWhatsAppCarouselMessage(
      userId,
      '🥟 Our Momo Varieties - Tap "Add to Order" to select your favorites!',
      cards
    );

    return {
      reply: null,
      updatedContext: { 
        ...context, 
        stage: 'viewing_momos',
        lastAction: 'show_momo_varieties',
        cart: context.cart || []
      }
    };
  },

  // Step 3: Confirm order with buttons
  confirm_order: async (args, userId, context) => {
    const items = args.items || context.cart || [
      { name: 'Steamed Chicken Momo', quantity: 1, price: 150 }
    ];

    const orderLines = items.map(item => 
      `• ${item.name} x${item.quantity} - ₹${item.price * item.quantity}`
    ).join('\n');

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderDetails = `${orderLines}\n━━━━━━━━━━━━━━━\nTotal: ₹${total}`;

    await sendOrderConfirmationMessage(userId, orderDetails);

    return {
      reply: null,
      updatedContext: { 
        ...context, 
        stage: 'confirming_order',
        lastAction: 'confirm_order',
        pendingOrder: { items, total }
      }
    };
  },

  // Step 4: Process order confirmation response
  process_order_response: async (args, userId, context) => {
    const { action } = args;

    if (action === 'confirmed') {
      await sendWhatsAppMessage(
        userId,
        `✅ Order Confirmed!\n\nThank you for your order! Your delicious food is being prepared and will be delivered in 30-40 minutes.\n\nOrder ID: #MH${Date.now().toString().slice(-6)}\n\nEnjoy your meal! 🥟`
      );
      return {
        reply: null,
        updatedContext: { 
          stage: 'order_complete',
          lastAction: 'order_confirmed',
          cart: []
        }
      };
    } else {
      await sendWhatsAppMessage(
        userId,
        `❌ Order Cancelled\n\nNo worries! Your order has been cancelled. Feel free to browse our menu again whenever you're ready.\n\nType "menu" to start a new order! 🍽️`
      );
      return {
        reply: null,
        updatedContext: { 
          stage: 'order_cancelled',
          lastAction: 'order_cancelled',
          cart: []
        }
      };
    }
  },

  // Simple text reply
  send_text_reply: async (args, userId, context) => {
    await sendWhatsAppMessage(userId, args.message);
    return {
      reply: null,
      updatedContext: context
    };
  }
};

// Handle button/list reply callbacks from WhatsApp
function parseInteractiveReply(message) {
  // Check for button reply
  if (message.interactive?.type === 'button_reply') {
    return {
      type: 'button',
      id: message.interactive.button_reply.id,
      title: message.interactive.button_reply.title
    };
  }
  // Check for list reply
  if (message.interactive?.type === 'list_reply') {
    return {
      type: 'list',
      id: message.interactive.list_reply.id,
      title: message.interactive.list_reply.title
    };
  }
  return null;
}

async function routeIntent({ text, context, userId, interactiveReply }) {
  // Handle interactive replies (button clicks, list selections)
  if (interactiveReply) {
    const { id, title } = interactiveReply;

    // User selected Momos from menu
    if (id === 'cat_momos') {
      return await toolHandlers.show_momo_varieties({}, userId, context);
    }

    // User clicked Add to Order on a momo
    if (id.startsWith('add_')) {
      const momoKey = id.replace('add_', '');
      const momo = momoImages[momoKey];
      if (momo) {
        const cart = context.cart || [];
        cart.push({ 
          name: momo.name, 
          quantity: 1, 
          price: parseInt(momo.price.replace('₹', '')) 
        });
        return await toolHandlers.confirm_order({ items: cart }, userId, { ...context, cart });
      }
    }

    // User confirmed or cancelled order
    if (id === 'confirm_order') {
      return await toolHandlers.process_order_response({ action: 'confirmed' }, userId, context);
    }
    if (id === 'cancel_order') {
      return await toolHandlers.process_order_response({ action: 'cancelled' }, userId, context);
    }

    // Other category selections - show coming soon
    if (id.startsWith('cat_')) {
      await sendWhatsAppMessage(userId, `${title} coming soon! For now, try our delicious Momos! 🥟`);
      return { reply: null, updatedContext: context };
    }
  }

  // Use LLM to detect intent and decide which tool to call
  const decision = await detectIntentAndRespond(text, context);

  if (decision.toolCall && toolHandlers[decision.toolCall.name]) {
    return await toolHandlers[decision.toolCall.name](
      decision.toolCall.arguments,
      userId,
      context
    );
  }

  // Fallback
  return {
    reply: decision.response || "Sorry, I didn't understand that. Type 'menu' to see our options!",
    updatedContext: context
  };
}

export { routeIntent, parseInteractiveReply };

