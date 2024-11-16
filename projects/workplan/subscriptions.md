# Subscription Payments
This project will enable members to change their subscription level to the credex ecosystem. Initially there will be two options available, with three others to be published soon:
1. Open (memberTier 1) is free and automatic on member creation
2. Verified (memberTier 2) will require completing an identity verification process and will not be available on launch
3. Hustler (memberTier 3) will require a monthly $1 payment
4. Entrepreneur (memberTier 4) will require a monthly $5 payment and will not be available on launch
5. Investor (memberTier 5) will require a monthly $20 payment and will not be available on launch

Once the ID verification process is built we will require it as a prereq to higher tiers, but on launch members will be able to switch between 1 and 3 with only a payment prereq.

## Recurring
Currently there are DCO_GIVE and REGULAR templates for recurring transactions, to which we need to add a MEMBERTIER_SUBSCRIPTION templateType.

The front end of the creation of DCO_GIVE templates by hitting /createRecurring with specific template variables has not yet been tested, and maybe not even created. This project needs to implement that part of the functionaility for DCO_GIVE and MEMBERTIER_SUBSCRIPTION templates.

When /createRecurring is passed DCO_GIVE and valid DCOgiveInCXX and DCOdenom values, the DCO_GIVE Recurring template is created.

When /createRecurring is passed MEMBERTIER_SUBSCRIPTION and a valid memberTier value, the route needs to change the state of memberTier accordingly. On launch, the only value accepted for memberTier will be 3. In order to switch back to memberTier 1, a member would cancel their recurring credex, which will downgrade their subscription when the current period ends.

## First Payment
When the /createRecurring endpoint is hit for REGULAR or MEMBERTIER_SUBSCRIPTION types, it needs to process an initial credex immediately, and then set the next payment date to the next date on the payment schedule, which in the case of MEMBERTIER_SUBSCRIPTION is going to be every 4 weeks. This 4 week cycle needs to be added as an option called MONTH13 to the frequency enum, and the processing and setting of next payment dates needs to be handled accordingly.

## DCOavatars
Recurring transactions are processed in the DCO avatars secion of the DCO, with special treatment given to DCO_GIVE. We need to add the processing of MEMBERTIER_SUBSCRIPTION templates to this process.

A MEMBERTIER_SUBSCRIPTION will be paid by secured credex. Payment from any account owned by a member will be associated with that member's memberTier.

After the MEMBERTIER_SUBSCRIPTION templates have been processed, we need to add a check and update for memberTier on every member.

<pre>
MATCH (member:Member)-[OWNS]->(account:Account)-[:ACTIVE|INACTIVE]->(subscriptionRec:Recurring { templateType: "MEMBERTIER_SUBSCRIPTION" })-[:SIGNED]->(memberTierPayment:Credex)-[:CREATED_ON]->(daynode:Daynode)
WHERE daynode.Date = //within the last 28 days
// sum memberTierPayment.InitialAmount / daynode[USD] as currentPay and if currentPay is greater than or equal to 1 then set member.memberTier = 3 else if less than 1 set memberTier to 1.
</pre>