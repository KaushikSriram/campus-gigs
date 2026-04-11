const supabase = require('../database');
const { generateId } = require('../utils/helpers');

async function createNotification(userId, type, title, body, data = {}) {
  const id = generateId();
  await supabase
    .from('notifications')
    .insert({ id, user_id: userId, type, title, body, data });
  return id;
}

module.exports = { createNotification };
