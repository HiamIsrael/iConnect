import jwt from 'jsonwebtoken';
import { getUserById } from './store.js';
import { config } from './config.js';

const JWT_SECRET = config.jwtSecret;
const TOKEN_TTL = config.jwtTtl;

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL },
  );
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    if (user.blocked) return res.status(403).json({ error: 'This account has been suspended.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (req.user.role !== role) {
      return res.status(403).json({ error: `This action requires a ${role} account.` });
    }
    next();
  };
}
