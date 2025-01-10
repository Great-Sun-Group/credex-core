export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  key: string;
}

export interface SecurityConfig {
  encryption: {
    algorithm: string;
    keySize: number;
    ivSize: number;
    tagSize: number;
    saltSize: number;
  };
}

export interface DecodedUser {
  memberID: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: { memberID: string; };
    }
  }
} 