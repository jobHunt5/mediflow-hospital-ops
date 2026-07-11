import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set — add it to backend/.env (see .env.example)');
}
const TOKEN_TTL = '12h';

export function signToken(account) {
  return jwt.sign(
    { role: account.role, department: account.department, workerId: account.workerId || null },
    JWT_SECRET,
    { subject: account.id, expiresIn: TOKEN_TTL }
  );
}

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  // EventSource can't set custom headers, so the SSE stream authenticates via query string.
  if (req.query && req.query.token) return req.query.token;
  return null;
}

export function authRequired(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Missing auth token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = { accountId: payload.sub, role: payload.role, department: payload.department, workerId: payload.workerId };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function adminOnly(req, res, next) {
  if (req.auth?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}
