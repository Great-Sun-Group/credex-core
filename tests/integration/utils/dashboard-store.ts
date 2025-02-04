interface DashboardState {
  before: any;
  after: any;
}

export class DashboardStore {
  private states: Map<string, DashboardState> = new Map();

  // Update the after state for a member
  updateAfterState(memberID: string, dashboard: any) {
    if (!this.states.has(memberID)) {
      this.states.set(memberID, { before: null, after: null });
    }
    this.states.get(memberID)!.after = dashboard;
  }

  // Get current states for a member
  getStates(memberID: string): DashboardState {
    return this.states.get(memberID) || { before: null, after: null };
  }

  // Initialize before state for a member
  initializeState(memberID: string, dashboard: any) {
    this.states.set(memberID, {
      before: dashboard,
      after: null,
    });
  }

  // Helper to get secured balance for a specific denomination
  private getSecuredBalance(account: any, denomination: string): number {
    const balance = account.balanceData.securedNetBalancesByDenom
      .find((b: string) => b.endsWith(` ${denomination}`))
      ?.split(" ")[0] || "0";
    return parseFloat(balance);
  }

  // Verify balance changes and promote after to before if successful
  verifyAndPromote(
    memberID: string,
    accountID: string,
    expectedAmount: string,
    denomination: string,
    isSender: boolean
  ): void {
    const states = this.getStates(memberID);
    if (!states.before || !states.after) {
      throw new Error(`Missing before/after state for member ${memberID}`);
    }

    const expectedNum = parseFloat(expectedAmount);

    // Find the account in both states by exact accountID
    const beforeAccount = states.before.accounts.find(
      (acc: any) => acc.accountID === accountID
    );
    const afterAccount = states.after.accounts.find(
      (acc: any) => acc.accountID === accountID
    );

    if (!beforeAccount || !afterAccount) {
      throw new Error(`Account ${accountID} not found for member ${memberID}`);
    }

    const beforeBalance = this.getSecuredBalance(beforeAccount, denomination);
    const afterBalance = this.getSecuredBalance(afterAccount, denomination);
    const actualChange = afterBalance - beforeBalance;

    // Calculate expected change based on whether this is the sender
    const expectedChange = isSender ? -expectedNum : expectedNum;

    console.log(`Account ${beforeAccount.accountName} balance change:`, {
      accountID: beforeAccount.accountID,
      before: beforeBalance,
      after: afterBalance,
      expected: expectedChange,
      change: actualChange,
      isSender
    });

    // Verify the change matches the expected amount
    if (Math.abs(actualChange - expectedChange) > 0.001) {
      throw new Error(
        `Balance change ${actualChange} does not match expected amount ${expectedChange} ` +
        `for account ${beforeAccount.accountName}`
      );
    }

    // If we get here, verification passed
    // Promote after to before and clear after
    states.before = states.after;
    states.after = null;
  }
}
