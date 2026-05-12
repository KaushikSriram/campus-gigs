const jwt = require('jsonwebtoken');
const supabase = require('../database');

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.is_suspended) {
      return res.status(403).json({ error: 'Account suspended' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Optional auth - sets req.user if token is valid, otherwise continues without user
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (user && !user.is_suspended) {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
}

module.exports = auth;
module.exports.optionalAuth = optionalAuth;
