import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { getFirebaseAuth } from '../config/firebaseAdmin.js';
import { isLikelyLocalToken, verifyLocalToken } from './localAuthService.js';

const GOOGLE_SECURETOKEN_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const isPlaceholder = (value = '') => {
  if (!value) return true;
  const normalized = String(value).trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes('your_') ||
    normalized.includes('your-project') ||
    normalized.includes('your_project') ||
    normalized.includes('placeholder')
  );
};

const isProjectConfigured = !isPlaceholder(env.FIREBASE_PROJECT_ID);

const toUserPayload = (decoded = {}) => ({
  uid: decoded.uid || decoded.user_id || decoded.sub || null,
  email: decoded.email || null,
  name: decoded.name || null,
  picture: decoded.picture || null
});

export const getFirebaseAuthConfigState = () => {
  if (getFirebaseAuth()) {
    return {
      mode: 'firebase-admin',
      ready: true
    };
  }

  if (isProjectConfigured) {
    return {
      mode: 'google-jwks',
      ready: true
    };
  }

  return {
    mode: 'unconfigured',
    ready: false
  };
};

export const verifyFirebaseIdToken = async (token) => {
  const adminAuth = getFirebaseAuth();

  if (adminAuth) {
    const decoded = await adminAuth.verifyIdToken(token);
    return toUserPayload(decoded);
  }

  if (!isProjectConfigured) {
    const error = new Error(
      'Firebase auth is not configured. Set FIREBASE_PROJECT_ID (or full Firebase Admin credentials) in server/.env.'
    );
    error.status = 503;
    throw error;
  }

  try {
    const { payload } = await jwtVerify(token, GOOGLE_SECURETOKEN_JWKS, {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID
    });

    return toUserPayload(payload);
  } catch {
    const error = new Error('Invalid or expired authentication token.');
    error.status = 401;
    throw error;
  }
};

export const verifyAccessToken = async (token) => {
  if (isLikelyLocalToken(token)) {
    return verifyLocalToken(token);
  }

  return verifyFirebaseIdToken(token);
};
