# MinuteTransactionQueue (MTQ)

The Minute Transaction Queue is a crucial part of the Credex ecosystem that runs every minute. It links the main ledgerSpace database (the source of truth and full information) to a searchSpace database (optimized to find credloops). New accounts are first added to the searchSpace, then new credexes. After each new credex is added, the ecosystem finds and clears all possible loops created by the new credex.

1. Processing new accounts:

   - Finds accounts with "PENDING_ACCOUNT" status in the ledger space.
   - Creates corresponding accounts in the search space.
   - Updates the account status to "PROCESSED" in the ledger space.

2. Processing new Credexes:
   - Retrieves Credexes with "PENDING_CREDEX" status from the ledger space.
   - Sorts them by acceptance time.
   - For each Credex, it calls the LoopFinder function.

## LoopFinder.ts

Checks if the credex already exists in the search space. If not, it creates it.

1. Finds all loops starting and ending at the specified account.
   - Identifies the loop with the earliest due date.
   - For each node in the loop, it selects the Credex with the earliest due date (or largest amount if tied).
   - Identifies the minimum outstanding amount among all credexes in the loop.
2. If a loop is found:
   - Subtract the minimum amount from all Credexes in the loop.
   - Update the searchSpace, removing fully redeemed credexes and updating the earliest due dates.
   - Update the ledgerSpace, creating a LoopAnchor to represent the cleared loop, update the Credexes' outstanding and redeemed amounts, and create REDEEMED and CREDLOOP relationships.
   - For fully redeemed credexes, replace the OWES relationships with CLEARED relationships in ledgerSpace.
3. Go back to step one until no loop is found.
4. Once no more loops can be found, mark the original Credex as processed and exit the loop.

This implementation actualizes the Credex Principle by finding loops where "If I owe you, and you owe them, and they owe me, we're square." It automatically clears these loops, reducing the outstanding amounts of all involved credexes by the same amount (the minimum amount in the loop).

The LoopFinder is called by the MinuteTransactionQueue for each new Credex, ensuring that loops are found and cleared as soon as possible after new Credexes are created.