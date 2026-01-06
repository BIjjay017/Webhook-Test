import { detectIntentAndRespond } from '../ai/intentEngine.js';
import {
  sendWhatsAppMessage,
  sendWhatsAppListMessage,
  sendWhatsAppImageMessage,
  sendWhatsAppButtonMessage,
  sendOrderConfirmationMessage
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

  // Step 2: Show momo varieties with images first, then selection list
  show_momo_varieties: async (args, userId, context) => {
    // Send an appetizing image of momos first
    await sendWhatsAppImageMessage(
      userId,
      'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&q=80',
      '🥟 *Our Fresh Handmade Momos!*\n\n✨ Steamed • Fried • Tandoori • Chocolate\n\nAll prepared with love using authentic recipes. Select your favorites below!'
    );

    // Small delay to ensure image arrives first
    await new Promise(resolve => setTimeout(resolve, 500));

    // Then send the selection list
    const sections = [
      {
        title: 'Steamed Momos',
        rows: [
          {
            id: 'add_steamedVegMomo',
            title: 'Steamed Veg Momo',
            description: `${momoImages.steamedVegMomo.price} - Fresh vegetables & herbs`
          },
          {
            id: 'add_steamedChickenMomo',
            title: 'Steamed Chicken Momo',
            description: `${momoImages.steamedChickenMomo.price} - Juicy chicken filling`
          }
        ]
      },
      {
        title: 'Fried & Tandoori',
        rows: [
          {
            id: 'add_friedMomo',
            title: 'Fried Momo',
            description: `${momoImages.friedMomo.price} - Crispy golden fried`
          },
          {
            id: 'add_tandooriMomo',
            title: 'Tandoori Momo',
            description: `${momoImages.tandooriMomo.price} - Smoky chargrilled`
          },
          {
            id: 'add_panFriedMomo',
            title: 'Pan Fried Momo',
            description: `${momoImages.panFriedMomo.price} - Crispy bottom, soft top`
          }
        ]
      },
      {
        title: 'Dessert',
        rows: [
          {
            id: 'add_chocolateMomo',
            title: 'Chocolate Momo',
            description: `${momoImages.chocolateMomo.price} - Sweet chocolate filled`
          }
        ]
      }
    ];

    await sendWhatsAppListMessage(
      userId,
      '🥟 Select Your Momo',
      'Choose a momo to add to your cart. You can add multiple items!',
      '10 pieces per plate',
      'Choose Momo',
      sections
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

  // Step 2.5: Show cart and ask if user wants to add more or checkout
  show_cart_options: async (args, userId, context) => {
    const cart = context.cart || [];
    
    if (cart.length === 0) {
      await sendWhatsAppMessage(userId, "Your cart is empty! Let me show you our menu.");
      return await toolHandlers.show_momo_varieties({}, userId, context);
    }

    const cartLines = cart.map(item => 
      `• ${item.name} x${item.quantity} - Rs.${item.price * item.quantity}`
    ).join('\n');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const buttons = [
      {
        type: 'reply',
        reply: {
          id: 'add_more_items',
          title: 'Add More Items ➕'
        }
      },
      {
        type: 'reply',
        reply: {
          id: 'proceed_checkout',
          title: 'Checkout 🛒'
        }
      }
    ];

    await sendWhatsAppButtonMessage(
      userId,
      '🛒 Your Cart',
      `${cartLines}\n━━━━━━━━━━━━━━━\nSubtotal: Rs.${total}\n\nWould you like to add more items or proceed to checkout?`,
      'You can add more items anytime!',
      buttons
    );

    return {
      reply: null,
      updatedContext: {
        ...context,
        stage: 'cart_options',
        lastAction: 'show_cart_options'
      }
    };
  },

  // Step 3: Confirm order with buttons
  confirm_order: async (args, userId, context) => {
    const items = args.items || context.cart || [
      { name: 'Steamed Chicken Momo', quantity: 1, price: 150 }
    ];

    const orderLines = items.map(item => 
      `• ${item.name} x${item.quantity} - Rs.${item.price * item.quantity}`
    ).join('\n');

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderDetails = `${orderLines}\n━━━━━━━━━━━━━━━\nTotal: Rs.${total}`;

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
    const message = args.message || "Hello! Welcome to Momo House 🥟 Type 'menu' to see our delicious options!";
    console.log(`━━━ SENDING TEXT REPLY ━━━`);
    console.log(`💬 Message: ${message}`);
    await sendWhatsAppMessage(userId, message);
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
  console.log(`━━━ ROUTING MESSAGE ━━━`);
  console.log(`📍 Context stage: ${context.stage || 'initial'}`);

  // Handle interactive replies (button clicks, list selections)
  if (interactiveReply) {
    const { id, title } = interactiveReply;
    console.log(`🔘 Interactive reply: ${id} - ${title}`);

    // User selected Momos from menu
    if (id === 'cat_momos') {
      return await toolHandlers.show_momo_varieties({}, userId, context);
    }

    // User clicked Add to Order on a momo - add to cart and show options
    if (id.startsWith('add_')) {
      const momoKey = id.replace('add_', '');
      const momo = momoImages[momoKey];
      if (momo) {
        const cart = context.cart || [];
        
        // Check if item already exists in cart
        const existingItem = cart.find(item => item.name === momo.name);
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          cart.push({ 
            name: momo.name, 
            quantity: 1, 
            price: parseInt(momo.price.replace('Rs.', '')) 
          });
        }

        // Show confirmation and cart options
        await sendWhatsAppMessage(userId, `✅ Added *${momo.name}* to your cart!`);
        
        return await toolHandlers.show_cart_options({}, userId, { ...context, cart });
      }
    }

    // User wants to add more items
    if (id === 'add_more_items') {
      return await toolHandlers.show_momo_varieties({}, userId, context);
    }

    // User wants to checkout
    if (id === 'proceed_checkout') {
      return await toolHandlers.confirm_order({ items: context.cart }, userId, context);
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
  console.log(`🤖 Asking LLM for intent...`);
  const decision = await detectIntentAndRespond(text, context);
  
  console.log(`━━━ LLM DECISION ━━━`);
  console.log(`🎯 Intent: ${decision.intent}`);
  console.log(`🔧 Tool: ${decision.toolCall?.name || 'none'}`);
  console.log(`📝 Args: ${JSON.stringify(decision.toolCall?.arguments || {})}`);

  if (decision.toolCall && toolHandlers[decision.toolCall.name]) {
    return await toolHandlers[decision.toolCall.name](
      decision.toolCall.arguments,
      userId,
      context
    );
  }

  // Fallback - send a default greeting if no tool matched
  const fallbackMessage = decision.response || "Hello! Welcome to Momo House 🥟 Type 'menu' to see our delicious options!";
  await sendWhatsAppMessage(userId, fallbackMessage);
  return {
    reply: null,
    updatedContext: context
  };
}

export { routeIntent, parseInteractiveReply };