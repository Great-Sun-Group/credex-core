@docs/due-diligence/DCO.html
@docs/due-diligence/MTQ.html

We need a script that produces/updates an html page saved to docs/reports/index.html
The page should be on the visual and brand template of @docs/index.html, but we need a mobile-first design.

At the top will be a line graph with number of new members, number of new credexes, and USD value exchanged per day.

Below the graph is the daily reports. we'll run the script every day and generate updated numbers for all data, including adding the new day

New members: (newMembers:Member)-[:CREATED_ON]->(:Daynode) COUNT newMembers per daynode
New accounts: (newAccounts:Account)-[:CREATED_ON]->(:Daynode) COUNT newAccounts per daynode
New credex transactions: (newCredexes:Credex)-[:CREATED_ON]->(:Daynode) COUNT newCredexes per daynode
Credex value exchanged: $XX.XX USD (newCredexes.InitialAmount * Daynode[USD])
Secured USD balances: $XX.XX USD
    MATCH (trustAccount:Account { accountType: "TRUST", defaultDenom: "USD" })<-[:CLAIMS_AGAINST]-(audit:TrustAuditReportDCO)-[:CREATED_ON]->(:Daynode)
    MATCH (audit)<-[claim:TRUST_AUDIT_CLAIM]-(account:Account)
    RETURN audit.reportID AS reportID, claim.claimAmountInDenom AS claim, account.accountName AS account

    every reportID will a single row with a negative value plus an unlimited set of positive values that sum to the negative value, netting the whole subset to zero.

    the 


Secured CAD balances: $XX.XX CAD (same as above)



