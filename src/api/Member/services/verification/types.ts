import { ServiceResult } from '../../../../types/apiResponse';
import { OTPManager } from './otpManager';

export enum VerificationProviderType {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email'
}

export interface IVerificationProvider {
  /**
   * Send an OTP to the specified recipient
   * @param to The recipient's contact (phone number, email, etc.)
   * @param otp The OTP to send
   * @returns ServiceResult indicating success/failure and any relevant metadata
   */
  sendOTP(to: string, otp: string): Promise<ServiceResult>;

  /**
   * Validate that an OTP was successfully delivered
   * @param deliveryId The provider-specific delivery ID
   * @returns boolean indicating if delivery was confirmed
   */
  validateDelivery(deliveryId: string): Promise<boolean>;

  /**
   * Get the type of verification provider
   * @returns The provider type
   */
  getProviderType(): VerificationProviderType;
}

export interface VerificationResult extends ServiceResult {
  deliveryId?: string;
  cooldownMinutes?: number;
  remainingAttempts?: number;
}

export enum VerificationError {
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_OTP = 'INVALID_OTP',
  OTP_EXPIRED = 'OTP_EXPIRED',
  MAX_ATTEMPTS_EXCEEDED = 'MAX_ATTEMPTS_EXCEEDED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  WHATSAPP_NOT_VERIFIED = 'WHATSAPP_NOT_VERIFIED',
  NON_PASSWORD_USER = 'NON_PASSWORD_USER'
}

export interface SecurityEvent {
  eventType: 'OTP_REQUEST' | 'OTP_VALIDATION' | 'WHATSAPP_VERIFICATION' | 'PASSWORD_RESET';
  memberID: string;
  version: 'v1' | 'v2';
  authMethod: 'phone_only' | 'password';
  timestamp: Date;
  metadata: Record<string, unknown>;
  severity: 'INFO' | 'WARN' | 'ERROR';
}

export interface VerificationConfig {
  otpExpiry: number;
  maxDailyRequests: number;
  cooldownMinutes: number;
  maxAttempts: number;
}

export type VerificationPurpose = 'PASSWORD_RESET' | undefined;

export interface VerificationServiceConfig {
  provider: IVerificationProvider;
  otpManager: OTPManager;
  config: VerificationConfig;
}
