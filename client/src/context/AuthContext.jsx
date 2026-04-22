import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  signInWithRedirect,
  setPersistence,
  signInWithPopup,
  signOut
} from 'firebase/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const LOCAL_SESSION_KEY = 'nutriscan_local_session';

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

const rawFirebaseConfig = {
  apiKey: "AIzaSyCRxLffowS1liH6xB9MccZlM_PfTtb8A5k",
  authDomain: "nutriscan-26cfc.firebaseapp.com",
  projectId: "nutriscan-26cfc",
  storageBucket: "nutriscan-26cfc.firebasestorage.app",
  messagingSenderId: "788390827982",
  appId: "1:788390827982:web:3a8010913d38d876d6fd9f"
};

const requiredFirebaseFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingFirebaseFields = requiredFirebaseFields.filter((field) =>
  isPlaceholder(rawFirebaseConfig[field])
);
const firebaseReady = missingFirebaseFields.length === 0;

const firebaseConfig = Object.fromEntries(
  Object.entries(rawFirebaseConfig).filter(([key, value]) => {
    if (['storageBucket', 'messagingSenderId'].includes(key)) {
      return !isPlaceholder(value);
    }
    return true;
  })
);

const app = firebaseReady ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [providerMode, setProviderMode] = useState(null);
  const [localSession, setLocalSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(
    firebaseReady
      ? ''
      : `Google login is unavailable (missing Firebase keys: ${missingFirebaseFields.join(', ')}). You can still use local login/register.`
  );

  const saveLocalSession = (session) => {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
    setLocalSession(session);
    setProviderMode('local');
    setUser({
      uid: session.user.uid,
      email: session.user.email,
      displayName: session.user.name,
      photoURL: session.user.picture || null,
      provider: 'local'
    });
  };

  const clearLocalSession = () => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    setLocalSession(null);
    if (providerMode === 'local') {
      setProviderMode(null);
      setUser(null);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.token && parsed?.user?.uid) {
          saveLocalSession(parsed);
          setLoading(false);
          return undefined;
        }
      } catch {
        localStorage.removeItem(LOCAL_SESSION_KEY);
      }
    }

    if (!auth) {
      setLoading(false);
      return undefined;
    }

    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Failed to set auth persistence', error);
    });

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (providerMode === 'local') {
        return;
      }

      setProviderMode(nextUser ? 'google' : null);
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, [providerMode]);

  const loginWithGoogle = async () => {
    if (!auth) {
      throw new Error(
        'Firebase client config is missing. Update client/.env and restart the frontend dev server.'
      );
    }

    setAuthError('');
    try {
      clearLocalSession();
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (
        error.code === 'auth/popup-blocked' ||
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request'
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      setAuthError(error.message || 'Google sign-in failed.');
      throw error;
    }
  };

  const requestLocalAuth = async (path, body) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Local authentication failed.');
    }

    saveLocalSession(payload);
    return payload;
  };

  const loginLocal = async ({ email, password }) =>
    requestLocalAuth('/auth/login', { email, password });

  const registerLocal = async ({ name, email, password }) =>
    requestLocalAuth('/auth/register', { name, email, password });

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      providerMode,
      loginWithGoogle,
      loginLocal,
      registerLocal,
      logout: async () => {
        clearLocalSession();
        if (auth?.currentUser) {
          await signOut(auth);
        }
      },
      getIdToken: async () => {
        if (localSession?.token) {
          return localSession.token;
        }
        return auth?.currentUser ? auth.currentUser.getIdToken() : null;
      }
    }),
    [user, loading, authError, providerMode, localSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
