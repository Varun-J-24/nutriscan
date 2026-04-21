import {
  verifyAccessToken
} from '../services/firebaseTokenVerifier.js';

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token.' });
  }

  try {
    req.user = await verifyAccessToken(token);
    return next();
  } catch (error) {
    return res.status(error.status || 401).json({
      error: error.message
    });
  }
};
