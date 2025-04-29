import axios from 'axios';
import { ServiceResult } from '../../../../types/apiResponse';
import { IVerificationProvider, VerificationProviderType, VerificationError } from './types';
import logger from '../../../../utils/logger';

export class WhatsAppProvider implements IVerificationProvider {
  private readonly apiKey: string;
  private readonly businessId: string;
  private readonly phoneId: string;
  private readonly apiBaseUrl: string;

  constructor() {
    this.apiKey = process.env.CREDEX_CORE_WHATSAPP_API_KEY || '';
    this.businessId = process.env.CREDEX_CORE_WHATSAPP_BUSINESS_ID || '';
    this.phoneId = process.env.CREDEX_CORE_WHATSAPP_PHONE_ID || '';
    this.apiBaseUrl = `https://graph.facebook.com/v22.0/${this.phoneId}`;
    
    if (!this.apiKey || !this.businessId || !this.phoneId) {
      logger.error('WhatsAppProvider: Missing required environment variables');
      throw new Error('CREDEX_CORE_WHATSAPP_API_KEY, CREDEX_CORE_WHATSAPP_BUSINESS_ID, and CREDEX_CORE_WHATSAPP_PHONE_ID are required');
    }

    logger.info('WhatsAppProvider initialized', {
      businessId: this.businessId,
      phoneId: this.phoneId,
      apiVersion: 'v22.0',
      apiBaseUrl: this.apiBaseUrl,
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey.length
    });
  }

  /**
   * Send an OTP via WhatsApp
   * @param to The phone number to send the OTP to
   * @param otp The OTP to send
   * @returns ServiceResult with delivery status and metadata
   */
  async sendOTP(to: string, otp: string): Promise<ServiceResult> {
    try {
      // Format phone number to international format if needed
      const formattedPhone = this.formatPhoneNumber(to);
      
      // Regular text message for OTP
      const message = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: `Your verification code is: ${otp}. This code will expire in 5 minutes.`
        }
      };

      logger.debug('Sending WhatsApp message:', {
        phone: formattedPhone,
        messageType: 'text',
        url: `${this.apiBaseUrl}/messages`,
        apiVersion: 'v22.0',
        businessId: this.businessId,
        phoneId: this.phoneId,
        messagePayload: JSON.stringify(message)
      });

      // Send message via WhatsApp API
      const response = await axios.post(
        `${this.apiBaseUrl}/messages`,
        message,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('WhatsApp API Response:', {
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(response.data),
        phone: formattedPhone
      });

      if (response.data.messages && response.data.messages[0]) {
        const deliveryId = response.data.messages[0].id;
        const messageStatus = response.data.messages[0].message_status;
        
        logger.info('WhatsApp message accepted:', {
          deliveryId,
          messageStatus,
          phone: formattedPhone
        });
        
        return {
          success: true,
          message: 'OTP sent successfully',
          data: {
            deliveryId,
            messageStatus
          }
        };
      }

      throw new Error('Invalid response from WhatsApp API');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          logger.error('WhatsApp API Error Response:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: JSON.stringify(error.response.data),
            headers: error.response.headers,
            phone: to,
            apiVersion: 'v22.0',
            businessId: this.businessId,
            phoneId: this.phoneId
          });
          return {
            success: false,
            message: 'Failed to send OTP',
            error: {
              code: VerificationError.PROVIDER_ERROR,
              details: error.response.data?.error?.message || 'Failed to send WhatsApp message'
            }
          };
        } else if (error.request) {
          // The request was made but no response was received
          logger.error('WhatsApp API No Response:', {
            request: error.request,
            phone: to,
            apiVersion: 'v22.0',
            businessId: this.businessId,
            phoneId: this.phoneId
          });
        }
      }
      
      logger.error('WhatsAppProvider: Failed to send OTP', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        phone: to 
      });
      
      return {
        success: false,
        message: 'Failed to send OTP',
        error: {
          code: VerificationError.PROVIDER_ERROR,
          details: 'Failed to send WhatsApp message'
        }
      };
    }
  }

  /**
   * Validate that a message was delivered
   * @param deliveryId The WhatsApp message ID
   * @returns boolean indicating if the message was delivered
   */
  async validateDelivery(deliveryId: string): Promise<boolean> {
    try {
      logger.debug('Validating WhatsApp message delivery:', {
        deliveryId,
        url: `${this.apiBaseUrl}/${deliveryId}`,
        apiVersion: 'v22.0',
        businessId: this.businessId,
        phoneId: this.phoneId
      });

      const response = await axios.get(
        `${this.apiBaseUrl}/${deliveryId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      const isDelivered = response.data.status === 'delivered';
      
      logger.info('WhatsApp message delivery status:', {
        deliveryId,
        status: response.data.status,
        isDelivered,
        responseData: JSON.stringify(response.data)
      });

      return isDelivered;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          logger.error('WhatsApp API Error Response during delivery validation:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: JSON.stringify(error.response.data),
            headers: error.response.headers,
            deliveryId,
            apiVersion: 'v22.0',
            businessId: this.businessId,
            phoneId: this.phoneId
          });
        } else if (error.request) {
          logger.error('WhatsApp API No Response during delivery validation:', {
            request: error.request,
            deliveryId,
            apiVersion: 'v22.0',
            businessId: this.businessId,
            phoneId: this.phoneId
          });
        }
      }
      
      logger.error('WhatsAppProvider: Failed to validate delivery', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryId 
      });
      return false;
    }
  }

  /**
   * Get the provider type
   * @returns VerificationProviderType.WHATSAPP
   */
  getProviderType(): VerificationProviderType {
    return VerificationProviderType.WHATSAPP;
  }

  /**
   * Format phone number to international format
   * @param phone The phone number to format
   * @returns Formatted phone number
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If it's already a long number (>10 digits), assume it has country code
    if (digits.length > 10) {
      return `+${digits}`;
    }
    
    // Otherwise add Zimbabwe country code
    return `+263${digits.startsWith('0') ? digits.slice(1) : digits}`;
  }
}
