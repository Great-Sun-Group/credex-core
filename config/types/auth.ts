import { Request } from "express";

export interface TokenPayload {
  memberID: string;
  iat: number;
  lastActivity: number;
  absoluteExpiry: number;
  version: 'v1' | 'v2';
  authMethod: 'phone_only' | 'password';
}

export interface Member {
  memberID: string;
  firstname: string;
  lastname: string;
  phone: string;
  memberHandle: string;
  defaultDenom: string;
  memberTier: number;
  createdAt: string;
  passwordHash?: string;
  passwordLastChanged?: string;
}

// Extend Express's Request type with our custom properties
export interface UserRequest extends Request {
  user: Member & Record<string, any>; // Allow additional properties from Neo4j
}

// Type guard to check if a request has a valid user
export function isUserRequest(req: Request): req is UserRequest {
  return (
    req.user !== undefined &&
    typeof req.user === 'object' &&
    'memberID' in req.user &&
    typeof req.user.memberID === 'string'
  );
}
