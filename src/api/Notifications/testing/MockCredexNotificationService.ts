import { ICredexNotificationService } from '../services/CredexNotificationService';
import logger from '../../../utils/logger';

type NotificationType = 'OFFER_CREATED' | 'OFFER_ACCEPTED' | 'OFFER_DECLINED' | 'OFFER_CANCELLED';

type NotificationParams = {
  credexID: string;
  amount: string;
  denomination: string;
  counterpartyName: string;
  requestId: string;
} & ({
  type: 'OFFER_CREATED' | 'OFFER_CANCELLED';
  receiverMemberID: string | null;
} | {
  type: 'OFFER_ACCEPTED' | 'OFFER_DECLINED';
  issuerMemberID: string | null;
});

export class MockCredexNotificationService implements ICredexNotificationService {
  private notifications: NotificationParams[] = [];
  private shouldFail: boolean = false;

  private async handleNotification(type: NotificationType, params: any): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Mock notification failure');
    }

    // Skip notifications if member ID is null
    if (((type === 'OFFER_CREATED' || type === 'OFFER_CANCELLED') && !params.receiverMemberID) ||
        ((type === 'OFFER_ACCEPTED' || type === 'OFFER_DECLINED') && !params.issuerMemberID)) {
      logger.debug(`Mock notification service: ${type} skipped - no member ID`, params);
      return;
    }

    logger.debug(`Mock notification service: ${type} called`, params);
    this.notifications.push({
      type,
      ...params
    });
  }

  async notifyOfferCreated(params: {
    receiverMemberID: string | null;
    credexID: string;
    amount: string;
    denomination: string;
    counterpartyName: string;
    requestId: string;
  }): Promise<void> {
    await this.handleNotification('OFFER_CREATED', params);
  }

  async notifyOfferAccepted(params: {
    issuerMemberID: string | null;
    credexID: string;
    amount: string;
    denomination: string;
    counterpartyName: string;
    requestId: string;
  }): Promise<void> {
    await this.handleNotification('OFFER_ACCEPTED', params);
  }

  async notifyOfferDeclined(params: {
    issuerMemberID: string | null;
    credexID: string;
    amount: string;
    denomination: string;
    counterpartyName: string;
    requestId: string;
  }): Promise<void> {
    await this.handleNotification('OFFER_DECLINED', params);
  }

  // Helper methods for testing
  getNotifications(): NotificationParams[] {
    return [...this.notifications];
  }

  clearNotifications(): void {
    this.notifications = [];
  }

  // Simulate failures for testing error scenarios
  setFailNextNotification(shouldFail: boolean = true): void {
    this.shouldFail = shouldFail;
  }

  // Helper methods for specific notification types
  getCreatedNotifications(): NotificationParams[] {
    return this.notifications.filter(n => n.type === 'OFFER_CREATED');
  }

  getAcceptedNotifications(): NotificationParams[] {
    return this.notifications.filter(n => n.type === 'OFFER_ACCEPTED');
  }

  getDeclinedNotifications(): NotificationParams[] {
    return this.notifications.filter(n => n.type === 'OFFER_DECLINED');
  }

  async notifyOfferCancelled(params: {
    receiverMemberID: string | null;
    credexID: string;
    amount: string;
    denomination: string;
    counterpartyName: string;
    requestId: string;
  }): Promise<void> {
    await this.handleNotification('OFFER_CANCELLED', params);
  }

  getCancelledNotifications(): NotificationParams[] {
    return this.notifications.filter(n => n.type === 'OFFER_CANCELLED');
  }
}
