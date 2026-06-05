import { resetToLogin } from '../navigation/navigationRef';

type SessionExpiredHandler = () => void | Promise<void>;

let sessionExpiredHandler: SessionExpiredHandler | null = null;
let isHandlingExpiry = false;

export const setSessionExpiredHandler = (handler: SessionExpiredHandler) => {
  sessionExpiredHandler = handler;
};

const base64Decode = (str: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  const cleaned = str.replace(/=+$/, '');
  
  for (let i = 0; i < cleaned.length; i += 4) {
    const chunk = cleaned.slice(i, i + 4);
    const indices = [];
    for (let j = 0; j < 4; j++) {
      const char = chunk[j];
      const idx = char ? chars.indexOf(char) : -1;
      indices.push(idx === -1 ? 0 : idx);
    }
    
    const byte1 = (indices[0] << 2) | (indices[1] >> 4);
    const byte2 = ((indices[1] & 15) << 4) | (indices[2] >> 2);
    const byte3 = ((indices[2] & 3) << 6) | indices[3];
    
    bytes.push(byte1);
    if (chunk.length > 2) {
      bytes.push(byte2);
    }
    if (chunk.length > 3) {
      bytes.push(byte3);
    }
  }

  try {
    return decodeURIComponent(
      bytes.map(b => '%' + b.toString(16).padStart(2, '0')).join('')
    );
  } catch {
    return bytes.map(b => String.fromCharCode(b)).join('');
  }
};

const decodeJwtPayload = (token: string): { exp?: number } | null => {
  try {
    const [, payloadSegment] = token.split('.');
    if (!payloadSegment) {
      return null;
    }

    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const payload = JSON.parse(base64Decode(`${normalized}${padding}`)) as { exp?: number };

    return payload;
  } catch {
    return null;
  }
};

export const isUnauthorizedError = (status?: number, message?: string): boolean => {
  const text = (message ?? '').toLowerCase();

  // 401 means the auth token is invalid or expired.
  if (status === 401) {
    return true;
  }

  // 403 is usually a permission issue (admin route, role mismatch), not session expiry.
  if (status === 403) {
    return false;
  }

  return (
    text.includes('token is not valid') ||
    text.includes('invalid token') ||
    text.includes('jwt expired') ||
    text.includes('token expired') ||
    text.includes('session expired') ||
    text.includes('authentication required') ||
    text.includes('not authenticated') ||
    (text.includes('token') && text.includes('expired'))
  );
};

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return false;
  }

  // Treat token as expired slightly before server time to avoid edge-case 401s.
  const expiryBufferMs = 30_000;
  return Date.now() >= payload.exp * 1000 - expiryBufferMs;
};

export const notifySessionExpired = async () => {
  if (isHandlingExpiry || !sessionExpiredHandler) {
    return;
  }

  isHandlingExpiry = true;

  try {
    await sessionExpiredHandler();
    resetToLogin();
  } finally {
    setTimeout(() => {
      isHandlingExpiry = false;
    }, 1500);
  }
};
