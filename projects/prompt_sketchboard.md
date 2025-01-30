currently the only things indicating a trust account is accountType=TRUST and a CREDEX_FOUNDATION_AUDITED relationships from the account with accountType=CREDEX_FOUNDATION, which is only created for one account (and itself) in the DB initialization process.

we need to make a robust accountType=TRUST.

first is top level type can be BANK or VAULT. VAULT will be placeholder for later, for now we focus on BANK.

BANK has jurisdiction type mapped to different account detail fields we will need globally. eg account, transit, branch for Canadian, different for US, and whatever standards everywhere. let's make this fully global, so that no matter where you are, you can register a bank account within this type structure. pay particular attention to the Zimbabwe and African standards. each account will also need a denom. it can be possible for a Canadian bank to have a USD account etc.

is there anything I'm missing here? we are trying to create a locked 1-1 relationship between this node representing a bank account, and the actual account. this is the first step in an audit process that will later be confirming balances of the account but for now just needs the basic structure of the account set up.

we'll need a new createTrustAccount endpoint modeled on createAccount, but that includes all these other checks and creations. for now this route has to be limited to those with memberTier=5

then we'll write a test, modeled on the other endpoint tests, so we can hit the endpoint and see what we've created.