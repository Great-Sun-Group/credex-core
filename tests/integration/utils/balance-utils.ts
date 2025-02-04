// Helper to get secured balance for a specific denomination from an account
export function getSecuredBalance(account: any, denomination: string): number {
  const balances = account.balanceData.securedNetBalancesByDenom;
  console.log(`Getting ${denomination} balance for ${account.accountName}:`, {
    balances,
    accountID: account.accountID,
  });
  const balance =
    balances
      .find((b: string) => b.endsWith(` ${denomination}`))
      ?.split(" ")[0] || "0";
  return parseFloat(balance);
}

// Helper to find account by ID in a dashboard response
export function findAccount(dashboard: any, accountID: string) {
  if (!dashboard || !dashboard.accounts) {
    throw new Error(`No dashboard data available for account ${accountID}`);
  }
  const account = dashboard.accounts.find((acc: any) => acc.accountID === accountID);
  if (!account) {
    throw new Error(`Account ${accountID} not found in dashboard`);
  }
  return account;
}

// Verify balance change between a previous known balance and new dashboard state
export function verifyBalanceChange(
  prevBalance: number,
  dashboard: any,
  accountID: string,
  expectedChange: number,
  denomination: string,
  accountName: string
) {
  const account = findAccount(dashboard, accountID);
  if (!account) {
    throw new Error(`Account ${accountID} not found in dashboard`);
  }

  const newBalance = getSecuredBalance(account, denomination);
  const actualChange = newBalance - prevBalance;

  console.log(`Account ${accountName} balance change:`, {
    accountID,
    before: prevBalance,
    after: newBalance,
    expected: expectedChange,
    change: actualChange,
  });

  if (Math.abs(actualChange - expectedChange) > 0.001) {
    throw new Error(
      `Balance change ${actualChange} does not match expected amount ${expectedChange} ` +
        `for account ${accountName}`
    );
  }

  return newBalance; // Return new balance for next verification
}
