const memory = new Map();

async function getContext(userId) {
  return memory.get(userId) || {};
}

async function updateContext(userId, context) {
  memory.set(userId, context);
}

module.exports = { getContext, updateContext };
