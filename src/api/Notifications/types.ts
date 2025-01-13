/**
 * @swagger
 * components:
 *   schemas:
 *     NotificationData:
 *       type: object
 *       required:
 *         - type
 *         - recipientID
 *         - data
 *       properties:
 *         type:
 *           $ref: '#/components/schemas/NotificationType'
 *         recipientID:
 *           type: string
 *           description: ID of the notification recipient
 *         data:
 *           type: object
 *           required:
 *             - credexID
 *           properties:
 *             credexID:
 *               type: string
 *               description: ID of the related Credex transaction
 *             amount:
 *               type: string
 *               description: Transaction amount
 *             denomination:
 *               type: string
 *               description: Currency denomination
 *             counterpartyName:
 *               type: string
 *               description: Name of the counterparty
 *             action:
 *               type: string
 *               description: Action for test notifications
 *             testMessage:
 *               type: string
 *               description: Message for test notifications
 *             clearedPayable:
 *               type: object
 *               properties:
 *                 amount:
 *                   type: string
 *                   description: Amount of cleared payable
 *                 denomination:
 *                   type: string
 *                   description: Currency denomination
 *                 owedTo:
 *                   type: string
 *                   description: Entity to whom the amount was owed
 *             clearedReceivable:
 *               type: object
 *               properties:
 *                 amount:
 *                   type: string
 *                   description: Amount of cleared receivable
 *                 denomination:
 *                   type: string
 *                   description: Currency denomination
 *                 owedFrom:
 *                   type: string
 *                   description: Entity from whom the amount was owed
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     NotificationType:
 *       type: string
 *       enum:
 *         - OFFER_CREATED
 *         - OFFER_CANCELLED
 *         - OFFER_ACCEPTED
 *         - OFFER_DECLINED
 *         - CREDLOOP_COMPLETED
 *       description: |
 *         Type of notification event:
 *         * `OFFER_CREATED` - A new Credex offer has been created
 *         * `OFFER_CANCELLED` - An existing offer has been cancelled by the issuer
 *         * `OFFER_ACCEPTED` - An offer has been accepted by the receiver
 *         * `OFFER_DECLINED` - An offer has been declined by the receiver
 *         * `CREDLOOP_COMPLETED` - A Credloop transaction has been completed
 */
export type NotificationType = 'OFFER_CREATED' | 'OFFER_CANCELLED' | 'OFFER_ACCEPTED' | 
                             'OFFER_DECLINED' | 'CREDLOOP_COMPLETED';

export interface NotificationData {
  type: NotificationType;
  recipientID: string;
  data: {
    credexID: string;
    amount?: string;
    denomination?: string;
    counterpartyName?: string;
    action?: string;
    testMessage?: string;
    clearedPayable?: {
      amount: string;
      denomination: string;
      owedTo: string;
    };
    clearedReceivable?: {
      amount: string;
      denomination: string;
      owedFrom: string;
    };
  };
}

/**
 * @swagger
 * components:
 *   schemas:
 *     FCMToken:
 *       type: object
 *       required:
 *         - token
 *         - userId
 *         - platform
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         token:
 *           type: string
 *           description: Firebase Cloud Messaging token
 *         userId:
 *           type: string
 *           description: User ID associated with the token
 *         platform:
 *           type: string
 *           enum: [ios, android]
 *           description: Device platform
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Token creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Token last update timestamp
 */
export interface FCMToken {
  token: string;
  userId: string;
  platform: 'ios' | 'android';
  createdAt: Date;
  updatedAt: Date;
}
