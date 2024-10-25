# Avatar

This module handles operations related to Avatars in the Credex ecosystem. Avatars are nodes that members can delegate signing authority to. Currently, the only Avatar implemented is a Recurring transaction. Once this Avatar is signed by the counterparties, it activates on the schedule agreed by the counterparties to create a Credex using the data agreed between the counterparties. The trail of accountability is maintained because the creation of an Avatar must be signed by the counterparties, and the Avatar signs every Credex it creates.

The Avatar module exposes the following endpoints:

1. **requestRecurring** (POST)

   - Function: Creates a new recurring transaction request.
   - Required variables:
     - signerMemberID: string
     - requestorAccountID: string
     - counterpartyAccountID: string
     - InitialAmount: number
     - Denomination: string
     - nextPayDate: string
     - daysBetweenPays: number
   - Optional variables:
     - securedCredex: boolean
     - credspan: number
     - remainingPays: number
   - Requires either securedCredex = true or a credspan between 7 and 35.
   - remainingPays is set when the avatar will run a specific number of times before completion, and not set when the avatar is to continue indefinitely.

2. **acceptRecurring** (POST)

   - Function: Accepts a recurring transaction request.
   - Required variables:
     - avatarID: string
     - signerID: string

3. **cancelRecurring** (POST)
   - Function: Cancels an active recurring transaction or declines a pending request.
   - Required variables:
     - signerID: string
     - cancelerAccountID: string
     - avatarID: string

These endpoints provide functionality for managing recurring transactions within the Credex ecosystem:

- The requestRecurring endpoint allows for the creation of new recurring transaction requests. It sets up the details of the recurring transaction, including the accounts involved, the amount, denomination, frequency, and duration.

- The acceptRecurring endpoint facilitates the acceptance of these requests. When a recurring transaction is accepted, it becomes active and will automatically create Credex transactions according to the specified schedule.

- The cancelRecurring endpoint enables the cancellation of an active recurring transaction or the declination of a pending request. This provides flexibility for users to modify or end recurring arrangements as needed.

The Avatar module enhances the automation and flexibility of transactions within the Credex ecosystem by allowing members to set up recurring transactions. This feature is particularly useful for regular payments, subscriptions, or any other scenario where periodic transactions are required. The implementation maintains accountability by requiring explicit acceptance of recurring transaction requests and allowing for their cancellation at any time.