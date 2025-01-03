import { NotificationService } from '../NotificationService';
import logger from '../../../utils/logger';

export interface ICredexNotificationService {
  notifyOfferCreated(params: {
    receiverMemberID: string | null;
    credexID: string;
    amount: string;
    denomination: string;
    counterpartyName: string;
    requestId: string;
  }): Promise<void>;

  notifyOfferAccepted(params: {
    issuerMemberID: string | null;
    credexID: string;
    amount: string;
    denomination: string;
    counterpartyName: string;
    requestId: string;
  }): Promise<void>;

  notifyOfferDeclined(params: {
    issuerMemberID: string | null;
    credexID: string;
    amount: string;
    denomination: string;
    counterpartyName: string;
    requestId: string;
  }): Promise<void>;
}

export class CredexNotificationService implements ICredexNotificationService {
  private static instance: CredexNotificationService;
  private notificationService: Awaited<ReturnType<typeof NotificationService.getInstance>> | null = null;

  private constructor() {
    this.initializeNotificationService();
  }

  public static async getInstance(): Promise<CredexNotificationService> {
    if (!CredexNotificationService.instance) {
      CredexNotificationService.instance = new CredexNotificationService();
    }
    return CredexNotificationService.instance;
  }

  private async initializeNotificationService(): Promise<void> {
    try {
      this.notificationService = await NotificationService.getInstance();
    } catch (error) {
      logger.error("Failed to initialize notification service:", error);
    }
  }

  async notifyOfferCreated({
    receiverMemberID,
    credexID,
    amount,
    denomination,
    counterpartyName,
    requestId
  }: {
    receiverMemberID: string | null;
    credexID: string;
    amount: string;
    denomination: string;
    counterpartyName: string;
    requestId: string;
  }): Promise<void> {
    if (receiverMemberID && this.notificationService) {
      try {
        await this.notificationService.sendNotification({
          type: 'OFFER_CREATED',
          recipientID: receiverMemberID,
          data: {
            credexID,
            amount,
            denomination,
            counterpartyName,
          }
        });
      } catch (error) {
        logger.error("Failed to send notification for new Credex offer", {
          error: error instanceof Error ? error.message : "Unknown error",
          credexID,
          requestId,
        });
      }
    } else if (!receiverMemberID) {
      logger.debug("No memberID found for receiver, skipping notification", {
        requestId,
      });
    } else if (!this.notificationService) {
      logger.warn("Notification service not initialized, skipping notification", {
        credexID,
        requestId,
      });
    }
  }

  async notifyOfferAccepted({
    issuerMemberID,
    credexID,
    amount,
    denomination,
    counterpartyName,
    requestId
  }: {
    issuerMemberID: string | null;
    credexID: string;
    amount: string;
    denomination: string;
    counterpartyName: string;
    requestId: string;
  }): Promise<void> {
    if (issuerMemberID && this.notificationService) {
      try {
        await this.notificationService.sendNotification({
          type: 'OFFER_ACCEPTED',
          recipientID: issuerMemberID,
          data: {
            credexID,
            amount,
            denomination,
            counterpartyName,
          }
        });
      } catch (error) {
        logger.error("Failed to send notification for accepted Credex", {
          error: error instanceof Error ? error.message : "Unknown error",
          credexID,
          requestId,
        });
      }
    } else if (!issuerMemberID) {
      logger.debug("No memberID found for issuer, skipping notification", {
        requestId,
      });
    } else if (!this.notificationService) {
      logger.warn("Notification service not initialized, skipping notification", {
        credexID,
        requestId,
      });
    }
  }

  async notifyOfferDeclined({
    issuerMemberID,
    credexID,
    amount,
    denomination,
    counterpartyName,
    requestId
  }: {
    issuerMemberID: string | null;
    credexID: string;
    amount: string;
    denomination: string;
    counterpartyName: string;
    requestId: string;
  }): Promise<void> {
    if (issuerMemberID && this.notificationService) {
      try {
        await this.notificationService.sendNotification({
          type: 'OFFER_DECLINED',
          recipientID: issuerMemberID,
          data: {
            credexID,
            amount,
            denomination,
            counterpartyName,
          }
        });
      } catch (error) {
        logger.error("Failed to send notification for declined Credex", {
          error: error instanceof Error ? error.message : "Unknown error",
          credexID,
          requestId,
        });
      }
    } else if (!issuerMemberID) {
      logger.debug("No memberID found for issuer, skipping notification", {
        requestId,
      });
    } else if (!this.notificationService) {
      logger.warn("Notification service not initialized, skipping notification", {
        credexID,
        requestId,
      });
    }
  }
}
