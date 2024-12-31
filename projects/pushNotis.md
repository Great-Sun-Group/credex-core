# Push Notifications Implementation Plan

## 1. Offer Notifications

### When Offer is Sent
- **Trigger Point**: CreateCredex.ts after successful creation
- **Recipient**: Account receiving the offer
- **Data**: 
  - CredexID
  - Amount and denomination
  - Issuer account name
  - Secured status
  - Due date (if applicable)

### When Offer is Cancelled
- **Trigger Point**: CancelCredex.ts after successful cancellation
- **Recipient**: Account that received the offer
- **Data**:
  - CredexID
  - Amount and denomination
  - Issuer account name
  - Cancellation timestamp

## 2. Response Notifications

### When Offer is Accepted/Declined
- **Trigger Point**: AcceptCredex.ts/DeclineCredex.ts after successful operation
- **Recipient**: Account that issued the offer
- **Data**:
  - CredexID
  - Amount and denomination
  - Acceptor/Decliner account name
  - Action taken (accepted/declined)
  - Response timestamp

## 3. MTQ Credloop Notifications

### When Credloop is Completed
- **Trigger Point**: LoopFinder.ts processCredloop function
- **Recipients**: All accounts involved in the loop
- **Data for Each Participant**:
  - Cleared payable details:
    - Amount owed that was cleared
    - Denomination
    - Account name it was owed to
  - Cleared receivable details:
    - Amount receivable that was cleared
    - Denomination
    - Account name it was owed from
  - Example message format:
    "Your debt of [amount] [denomination] owed to [account_name] has been cleared against the debt of [amount] [denomination] owed to you from [account_name]"

## Technical Implementation

### 1. Notification Service Structure
```typescript
interface NotificationData {
  type: 'OFFER_CREATED' | 'OFFER_CANCELLED' | 'OFFER_ACCEPTED' | 
        'OFFER_DECLINED' | 'CREDLOOP_COMPLETED';
  recipientID: string;
  data: {
    credexID?: string;
    amount?: string;
    denomination?: string;
    counterpartyName?: string;
    action?: string;
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
    timestamp: string;
  };
}
```

### 2. Integration Points

#### Offer Creation
```typescript
// In CreateCredex.ts
await NotificationService.send({
  type: 'OFFER_CREATED',
  recipientID: receiverAccountID,
  data: {
    credexID,
    amount: formattedInitialAmount,
    denomination: Denomination,
    counterpartyName: issuerAccountName,
    timestamp: new Date().toISOString()
  }
});
```

#### Credloop Processing
```typescript
// In LoopFinder.ts
for (const participant of credloopParticipants) {
  await NotificationService.send({
    type: 'CREDLOOP_COMPLETED',
    recipientID: participant.accountID,
    data: {
      clearedPayable: {
        amount: participant.clearedPayableAmount,
        denomination: participant.denomination,
        owedTo: participant.creditorName
      },
      clearedReceivable: {
        amount: participant.clearedReceivableAmount,
        denomination: participant.denomination,
        owedFrom: participant.debtorName
      },
      timestamp: new Date().toISOString()
    }
  });
}
```

### 3. Delivery System
- Queue-based processing using a message broker (e.g., Redis, RabbitMQ)
- Separate worker process for notification delivery
- Support for multiple delivery channels (in-app, email, push notifications)
- Retry mechanism for failed deliveries
- Rate limiting to prevent notification spam

### 4. Configuration Options
- User notification preferences
- Channel selection per notification type
- Template customization
- Delivery timing preferences
- Notification grouping options

### 5. Error Handling
- Failed delivery tracking
- Retry queue for failed notifications
- Error logging and monitoring
- Fallback delivery methods

### 6. Performance Considerations
- Asynchronous notification processing
- Batch processing for multiple notifications
- Caching of frequently used data
- Database optimization for notification queries
