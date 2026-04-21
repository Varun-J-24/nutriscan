import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createUser, findUserByEmail } from '../db/userStore.js';

const LOCAL_ISSUER = 'nutriscan-local';
const LOCAL_AUDIENCE = 'nutriscan-api';

const sanitizeUser = (user) => ({
  uid: `local:${user.id}`,
  email: user.email,
  name: user.name,
  picture: null,
  provider: 'local'
});

const signLocalToken = (user) =>
  jwt.sign(
    {
      email: user.email,
      name: user.name,
      provider: 'local'
    },
    env.JWT_SECRET,
    {
      subject: user.id,
      issuer: LOCAL_ISSUER,
      audience: LOCAL_AUDIENCE,
      expiresIn: env.JWT_EXPIRES_IN
    }
  );

export const registerLocalUser = async ({ email, name, password }) => {
  const existing = await findUserByEmail(email);
  if (existing) {
    const error = new Error('An account with this email already exists.');
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const created = await createUser({ email, name, passwordHash });

  return {
    token: signLocalToken(created),
    user: sanitizeUser(created)
  };
};

export const loginLocalUser = async ({ email, password }) => {
  const existing = await findUserByEmail(email);
  if (!existing) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  const ok = await bcrypt.compare(password, existing.passwordHash);
  if (!ok) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  return {
    token: signLocalToken(existing),
    user: sanitizeUser(existing)
  };
};

export const isLikelyLocalToken = (token) => {
  const decoded = jwt.decode(token);
  return decoded?.iss === LOCAL_ISSUER;
};

export const verifyLocalToken = (token) => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: LOCAL_ISSUER,
      audience: LOCAL_AUDIENCE
    });

    return {
      uid: `local:${payload.sub}`,
      email: payload.email || null,
      name: payload.name || null,
      picture: null,
      provider: 'local'
    };
  } catch {
    const error = new Error('Invalid or expired authentication token.');
    error.status = 401;
    throw error;
  }
};
