const { run } = require('../database');
const { generateId } = require('../utils/helpers');

function createNotification(userId, type, title, body, data = {}) {
  const id = generateId();
  run(
    'INSERT INTO notifications (id, user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, type, title, body, JSON.stringify(data)]
  );
  return id;
}

module.exports = { createNotification };
